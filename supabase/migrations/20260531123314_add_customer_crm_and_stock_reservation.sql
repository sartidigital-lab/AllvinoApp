alter table public.produtos
  add column if not exists estoque integer not null default 999 check (estoque >= 0);

alter table public.orders
  add column if not exists stock_reserved_at timestamptz;

create schema if not exists app_private;

create index if not exists produtos_estoque_idx
  on public.produtos (estoque);

create index if not exists produtos_sku_sankhya_idx
  on public.produtos (sku_sankhya);

create table if not exists public.stock_imports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  file_name text,
  total_rows integer not null default 0 check (total_rows >= 0),
  source text not null default 'excel'
);

create table if not exists public.stock_levels (
  product_code text primary key,
  quantity integer not null check (quantity >= 0),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  source text not null default 'manual',
  import_id uuid references public.stock_imports(id) on delete set null
);

grant select, insert on public.stock_imports to authenticated;
grant select, insert, update, delete on public.stock_levels to authenticated;

alter table public.stock_imports enable row level security;
alter table public.stock_levels enable row level security;

drop policy if exists "Admins can read stock imports" on public.stock_imports;
create policy "Admins can read stock imports"
  on public.stock_imports
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can create stock imports" on public.stock_imports;
create policy "Admins can create stock imports"
  on public.stock_imports
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can manage stock levels" on public.stock_levels;
create policy "Admins can manage stock levels"
  on public.stock_levels
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function app_private.get_stock_levels_for_codes(p_codes text[])
returns table(product_code text, quantity integer)
language sql
security definer
set search_path = public, pg_temp
as $$
  select stock_levels.product_code, stock_levels.quantity
  from public.stock_levels
  where stock_levels.product_code = any(p_codes);
$$;

revoke all on function app_private.get_stock_levels_for_codes(text[]) from public;
grant execute on function app_private.get_stock_levels_for_codes(text[]) to authenticated;

create or replace function public.get_stock_levels_for_codes(p_codes text[])
returns table(product_code text, quantity integer)
language sql
as $$
  select *
  from app_private.get_stock_levels_for_codes(p_codes);
$$;

grant execute on function public.get_stock_levels_for_codes(text[]) to authenticated;

create or replace function app_private.reserve_product_stock_for_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item record;
  updated_count integer;
begin
  if not exists (
    select 1
    from public.orders
    where id = p_order_id
      and user_id = auth.uid()
      and stock_reserved_at is null
  ) then
    raise exception 'Pedido nao pertence ao usuario autenticado ou ja teve estoque reservado.';
  end if;

  for item in
    select
      order_items.product_id,
      produtos.sku_sankhya as product_code,
      sum(order_items.quantity)::integer as quantity
    from public.order_items
    join public.produtos on produtos.id = order_items.product_id
    where order_id = p_order_id
      and order_items.product_id is not null
    group by order_items.product_id, produtos.sku_sankhya
  loop
    if item.product_code is null or trim(item.product_code) = '' then
      raise exception 'Produto % nao possui codigo de estoque.', item.product_id;
    end if;

    update public.stock_levels
      set quantity = quantity - item.quantity,
          updated_at = now(),
          source = 'order'
      where product_code = item.product_code
        and quantity >= item.quantity;

    get diagnostics updated_count = row_count;

    if updated_count <> 1 then
      raise exception 'Estoque insuficiente para o codigo %.', item.product_code;
    end if;

    update public.produtos
      set estoque = greatest(estoque - item.quantity, 0)
      where id = item.product_id;
  end loop;

  update public.orders
    set stock_reserved_at = now()
    where id = p_order_id;
end;
$$;

revoke all on function app_private.reserve_product_stock_for_order(uuid) from public;
grant usage on schema app_private to authenticated;
grant execute on function app_private.reserve_product_stock_for_order(uuid) to authenticated;

create or replace function public.reserve_product_stock_for_order(p_order_id uuid)
returns void
language sql
as $$
  select app_private.reserve_product_stock_for_order(p_order_id);
$$;

grant execute on function public.reserve_product_stock_for_order(uuid) to authenticated;
