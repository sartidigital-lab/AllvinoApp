-- Orders must be created through the atomic checkout RPC so clients cannot
-- choose totals, prices, or bypass stock reservation with direct inserts.
revoke insert on public.orders from authenticated;
revoke insert on public.order_items from authenticated;

drop policy if exists "Users can create own orders" on public.orders;
drop policy if exists "Users can create items for own orders" on public.order_items;

create or replace function public.enforce_order_checkout_invariants()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.delivery_type not in ('Retirada na Loja', 'Entrega no Endereco') then
    raise exception 'Modalidade de entrega invalida.';
  end if;

  if coalesce(new.payment_method, '') not in ('Pix', 'Cartao (Link)', 'Cartao (Maquininha)') then
    raise exception 'Forma de pagamento invalida.';
  end if;

  if new.delivery_type = 'Entrega no Endereco'
    and nullif(btrim(coalesce(new.delivery_address, '')), '') is null then
    raise exception 'Informe o endereco de entrega.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_order_checkout_invariants() from public, anon, authenticated;

drop trigger if exists enforce_order_checkout_invariants on public.orders;
create trigger enforce_order_checkout_invariants
  before insert or update of delivery_type, payment_method, delivery_address
  on public.orders
  for each row execute function public.enforce_order_checkout_invariants();

create or replace function public.reject_unpublished_order_item()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_product_name text;
begin
  if new.quantity < 1 or new.quantity > 50 then
    raise exception 'Quantidade de produto invalida.';
  end if;

  if new.product_id is not null then
    select product.nome
      into v_product_name
    from public.produtos as product
    where product.id = new.product_id
      and product.publicado = true;

    if not found then
      raise exception 'Produto indisponivel para compra.';
    end if;

    new.product_name := v_product_name;
  end if;

  return new;
end;
$$;

revoke all on function public.reject_unpublished_order_item() from public, anon, authenticated;

-- The published-products SELECT policy already includes administrators.
-- Split mutations so authenticated SELECT does not evaluate duplicate policies.
drop policy if exists "Admins can manage products" on public.produtos;

drop policy if exists "Admins can insert products" on public.produtos;
create policy "Admins can insert products"
  on public.produtos for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can update products" on public.produtos;
create policy "Admins can update products"
  on public.produtos for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete products" on public.produtos;
create policy "Admins can delete products"
  on public.produtos for delete to authenticated
  using ((select public.is_admin()));

create or replace function public.set_manual_stock_level(
  p_product_code text,
  p_quantity integer
)
returns public.stock_levels
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_product_code text := upper(btrim(coalesce(p_product_code, '')));
  v_stock_level public.stock_levels%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem alterar estoque.';
  end if;

  if v_product_code = '' or length(v_product_code) > 120 then
    raise exception 'Codigo de produto invalido.';
  end if;

  if p_quantity is null or p_quantity < 0 then
    raise exception 'Quantidade de estoque invalida.';
  end if;

  if not exists (
    select 1
    from public.produtos as product
    where upper(btrim(product.sku_sankhya)) = v_product_code
  ) then
    raise exception 'Produto nao encontrado para o codigo informado.';
  end if;

  insert into public.stock_levels (product_code, quantity, source, import_id, updated_at)
  values (v_product_code, p_quantity, 'manual', null, now())
  on conflict (product_code) do update
    set quantity = excluded.quantity,
        source = excluded.source,
        import_id = null,
        updated_at = excluded.updated_at
  returning * into v_stock_level;

  update public.produtos as product
    set estoque = p_quantity
  where upper(btrim(product.sku_sankhya)) = v_product_code;

  return v_stock_level;
end;
$$;

revoke all on function public.set_manual_stock_level(text, integer) from public, anon;
grant execute on function public.set_manual_stock_level(text, integer) to authenticated;

notify pgrst, 'reload schema';
