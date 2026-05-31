alter table public.produtos
  add column if not exists estoque integer not null default 999 check (estoque >= 0);

alter table public.orders
  add column if not exists stock_reserved_at timestamptz;

create index if not exists produtos_estoque_idx
  on public.produtos (estoque);

create schema if not exists app_private;

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
    select product_id, sum(quantity)::integer as quantity
    from public.order_items
    where order_id = p_order_id
      and product_id is not null
    group by product_id
  loop
    update public.produtos
      set estoque = estoque - item.quantity
      where id = item.product_id
        and estoque >= item.quantity;

    get diagnostics updated_count = row_count;

    if updated_count <> 1 then
      raise exception 'Estoque insuficiente para o produto %.', item.product_id;
    end if;
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
