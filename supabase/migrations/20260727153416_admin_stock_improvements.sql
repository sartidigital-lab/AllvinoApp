create or replace function public.import_stock_levels_atomic(
  p_file_name text,
  p_source text,
  p_rows jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_import_id uuid;
  v_row_count integer;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem importar estoque.';
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Formato de linhas inválido.';
  end if;

  v_row_count := jsonb_array_length(p_rows);
  if v_row_count < 1 or v_row_count > 10000 then
    raise exception 'A importação deve conter entre 1 e 10.000 linhas.';
  end if;

  if length(trim(coalesce(p_file_name, ''))) < 1 or length(p_file_name) > 255 then
    raise exception 'Nome de arquivo inválido.';
  end if;

  if p_source not in ('xlsx', 'csv') then
    raise exception 'Origem de importação inválida.';
  end if;

  insert into public.stock_imports (file_name, total_rows, source)
  values (trim(p_file_name), v_row_count, p_source)
  returning id into v_import_id;

  with parsed as materialized (
    select
      upper(trim(item.value ->> 'product_code')) as product_code,
      greatest(0, trunc((item.value ->> 'quantity')::numeric)::integer) as quantity,
      item.ordinality
    from jsonb_array_elements(p_rows) with ordinality as item(value, ordinality)
    where trim(coalesce(item.value ->> 'product_code', '')) <> ''
      and (item.value ->> 'quantity') ~ '^\d+(\.\d+)?$'
  ),
  deduplicated as materialized (
    select distinct on (product_code) product_code, quantity
    from parsed
    order by product_code, ordinality desc
  ),
  saved as (
    insert into public.stock_levels (product_code, quantity, source, import_id, updated_at)
    select product_code, quantity, p_source, v_import_id, now()
    from deduplicated
    on conflict (product_code) do update
      set quantity = excluded.quantity,
          source = excluded.source,
          import_id = excluded.import_id,
          updated_at = excluded.updated_at
    returning product_code
  )
  update public.produtos as product
  set estoque = stock.quantity
  from deduplicated as stock
  where trim(product.sku_sankhya) = stock.product_code;

  get diagnostics v_row_count = row_count;

  select count(*)::integer
  into v_row_count
  from (
    select distinct upper(trim(item.value ->> 'product_code')) as product_code
    from jsonb_array_elements(p_rows) as item(value)
    where trim(coalesce(item.value ->> 'product_code', '')) <> ''
  ) rows;

  update public.stock_imports
  set total_rows = v_row_count
  where id = v_import_id;

  return v_row_count;
end;
$$;

revoke all on function public.import_stock_levels_atomic(text, text, jsonb) from public, anon;
grant execute on function public.import_stock_levels_atomic(text, text, jsonb) to authenticated;
