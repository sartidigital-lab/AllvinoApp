create or replace function public.import_catalog_pricing_atomic(p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  ignored_codes jsonb;
  updated_count integer;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem importar precificação.';
  end if;

  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'A importação deve conter ao menos uma linha.';
  end if;

  if jsonb_array_length(p_rows) > 10000 then
    raise exception 'A importação aceita no máximo 10.000 linhas.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as row(product_code text, price_from numeric, price_to numeric)
    where nullif(btrim(product_code), '') is null
      or price_from is null
      or price_from <= 0
      or (price_to is not null and (price_to <= 0 or price_to >= price_from))
  ) then
    raise exception 'A planilha possui código ou preço inválido.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as row(product_code text, price_from numeric, price_to numeric)
    group by upper(btrim(product_code))
    having count(*) > 1
  ) then
    raise exception 'A planilha possui códigos repetidos.';
  end if;

  with input_rows as (
    select upper(btrim(product_code)) as product_code
    from jsonb_to_recordset(p_rows) as row(product_code text, price_from numeric, price_to numeric)
  )
  select coalesce(jsonb_agg(input_rows.product_code order by input_rows.product_code), '[]'::jsonb)
  into ignored_codes
  from input_rows
  where not exists (
    select 1 from public.produtos where upper(btrim(sku_sankhya)) = input_rows.product_code
  );

  update public.produtos as product
  set preco = coalesce(input_rows.price_to, input_rows.price_from),
      preco_original = input_rows.price_from
  from (
    select upper(btrim(product_code)) as product_code, price_from, price_to
    from jsonb_to_recordset(p_rows) as row(product_code text, price_from numeric, price_to numeric)
  ) as input_rows
  where upper(btrim(product.sku_sankhya)) = input_rows.product_code;

  get diagnostics updated_count = row_count;
  return jsonb_build_object('updated_count', updated_count, 'ignored_codes', ignored_codes);
end;
$$;

revoke all on function public.import_catalog_pricing_atomic(jsonb) from public, anon;
grant execute on function public.import_catalog_pricing_atomic(jsonb) to authenticated;

notify pgrst, 'reload schema';
