-- Coupons can apply to the whole store or only to an explicit product selection.
-- The rule fields compose freely: minimum order value, bottle quantity and first order.
alter table public.promotions
  add column if not exists scope text not null default 'store',
  add column if not exists min_item_quantity integer,
  add column if not exists requires_first_purchase boolean not null default false,
  add column if not exists applicable_product_ids uuid[] not null default '{}',
  add column if not exists custom_rule text;

alter table public.promotions
  drop constraint if exists promotions_scope_valid,
  drop constraint if exists promotions_min_item_quantity_valid,
  drop constraint if exists promotions_selected_products_required,
  drop constraint if exists promotions_custom_rule_length,
  add constraint promotions_scope_valid check (scope in ('store', 'selected_products')),
  add constraint promotions_min_item_quantity_valid check (min_item_quantity is null or min_item_quantity > 0),
  add constraint promotions_selected_products_required check (
    scope <> 'selected_products' or cardinality(applicable_product_ids) > 0
  ),
  add constraint promotions_custom_rule_length check (custom_rule is null or length(custom_rule) <= 500);

create or replace function public.validate_promotion_product_selection()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.code := upper(regexp_replace(trim(new.code), '\s+', '', 'g'));
  new.title := trim(new.title);
  new.description := nullif(trim(coalesce(new.description, '')), '');
  new.custom_rule := nullif(trim(coalesce(new.custom_rule, '')), '');
  new.applicable_product_ids := coalesce(new.applicable_product_ids, '{}');

  if cardinality(new.applicable_product_ids) <> cardinality(array(select distinct unnest(new.applicable_product_ids))) then
    raise exception 'Os produtos do cupom nao podem se repetir.';
  end if;

  if exists (
    select 1
    from unnest(new.applicable_product_ids) as selected_product(id)
    left join public.produtos as product on product.id = selected_product.id
    where product.id is null
  ) then
    raise exception 'Um ou mais produtos selecionados nao existem.';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_promotion_product_selection() from public, anon, authenticated;

drop trigger if exists validate_promotion_product_selection on public.promotions;
create trigger validate_promotion_product_selection
  before insert or update on public.promotions
  for each row execute function public.validate_promotion_product_selection();

-- Replaces the checkout implementation so coupon rules are always evaluated
-- using prices and quantities trusted by the database, never browser totals.
create or replace function app_private.create_order_with_stock_reservation(
  p_cart_items jsonb,
  p_delivery_method text,
  p_payment_method text default null,
  p_delivery_address text default null,
  p_promotion_code text default null,
  p_delivery_zip_code text default null,
  p_customer_name text default null,
  p_customer_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_subtotal numeric(10, 2);
  v_eligible_subtotal numeric(10, 2) := 0;
  v_bottle_quantity integer := 0;
  v_pickup_discount numeric(10, 2) := 0;
  v_promotion_discount numeric(10, 2) := 0;
  v_discount numeric(10, 2) := 0;
  v_total numeric(10, 2);
  v_shipping_fee numeric(10, 2) := 0;
  v_promotion_code text := upper(regexp_replace(coalesce(p_promotion_code, ''), '\s+', '', 'g'));
  v_delivery_zip_code text := regexp_replace(coalesce(p_delivery_zip_code, ''), '\D', '', 'g');
  v_delivery_zone_name text := null;
  v_delivery_estimate_days integer := null;
  v_promotion public.promotions%rowtype;
  v_delivery_zone public.delivery_zones%rowtype;
  v_item record;
  v_updated_count integer;
begin
  if v_user_id is null then
    raise exception 'Nao autenticado.';
  end if;

  if coalesce(jsonb_typeof(p_cart_items), '') <> 'array' or jsonb_array_length(p_cart_items) = 0 then
    raise exception 'Pedido invalido.';
  end if;

  create temp table checkout_items (
    product_id uuid primary key,
    requested_name text,
    quantity integer not null check (quantity > 0)
  ) on commit drop;

  insert into checkout_items (product_id, requested_name, quantity)
  select item.id::uuid, max(nullif(trim(item.name), '')), sum(greatest(1, coalesce(item.quantity, 1)))::integer
  from jsonb_to_recordset(p_cart_items) as item(id text, name text, quantity numeric)
  group by item.id::uuid;

  if not exists (select 1 from checkout_items) then
    raise exception 'Pedido invalido.';
  end if;

  if exists (
    select 1 from checkout_items
    left join public.produtos as product on product.id = checkout_items.product_id
    where product.id is null or product.publicado is not true
  ) then
    raise exception 'Nao foi possivel validar os produtos.';
  end if;

  if exists (
    select 1 from checkout_items
    join public.produtos as product on product.id = checkout_items.product_id
    where nullif(trim(product.sku_sankhya), '') is null
  ) then
    raise exception 'Produto sem codigo de estoque.';
  end if;

  if exists (
    select 1 from checkout_items
    join public.produtos as product on product.id = checkout_items.product_id
    left join public.stock_levels as stock on stock.product_code = trim(product.sku_sankhya)
    where coalesce(stock.quantity, -1) < checkout_items.quantity
  ) then
    raise exception 'Estoque insuficiente para concluir o pedido.';
  end if;

  select coalesce(sum(checkout_items.quantity * catalog_products.effective_price), 0)::numeric(10, 2),
         coalesce(sum(checkout_items.quantity * greatest(1, coalesce(catalog_products.kit_item_count, 1))), 0)::integer
    into v_subtotal, v_bottle_quantity
  from checkout_items
  join public.catalog_products on catalog_products.id = checkout_items.product_id;

  if p_delivery_method = 'Retirada na Loja' then
    v_pickup_discount := (v_subtotal * 0.1)::numeric(10, 2);
  end if;

  if v_promotion_code <> '' then
    select * into v_promotion
    from public.promotions
    where code = v_promotion_code
      and is_active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    limit 1;

    if not found then
      raise exception 'Cupom invalido ou expirado.';
    end if;

    if v_promotion.requires_first_purchase and exists (
      select 1 from public.orders where user_id = v_user_id
    ) then
      raise exception 'Cupom valido somente para primeira compra.';
    end if;

    if v_subtotal < v_promotion.min_subtotal then
      raise exception 'Cupom nao atende ao valor minimo do pedido.';
    end if;

    if v_promotion.min_item_quantity is not null and v_bottle_quantity < v_promotion.min_item_quantity then
      raise exception 'Cupom nao atende a quantidade minima de garrafas.';
    end if;

    select coalesce(sum(checkout_items.quantity * catalog_products.effective_price), 0)::numeric(10, 2)
      into v_eligible_subtotal
    from checkout_items
    join public.catalog_products on catalog_products.id = checkout_items.product_id
    where v_promotion.scope = 'store'
       or checkout_items.product_id = any(v_promotion.applicable_product_ids);

    if v_eligible_subtotal <= 0 then
      raise exception 'Cupom nao se aplica aos produtos do carrinho.';
    end if;

    v_promotion_discount := case
      when v_promotion.discount_type = 'percent'
        then v_eligible_subtotal * (v_promotion.discount_value / 100)
      else v_promotion.discount_value
    end;

    if v_promotion.max_discount is not null then
      v_promotion_discount := least(v_promotion_discount, v_promotion.max_discount);
    end if;

    v_promotion_discount := least(v_eligible_subtotal, greatest(0, v_promotion_discount))::numeric(10, 2);
  else
    v_promotion_code := null;
  end if;

  v_discount := least(v_subtotal, v_pickup_discount + v_promotion_discount)::numeric(10, 2);

  if p_delivery_method = 'Entrega no Endereco' then
    if length(v_delivery_zip_code) <> 8 then
      raise exception 'Informe um CEP valido para entrega.';
    end if;

    select * into v_delivery_zone
    from public.delivery_zones
    where is_active = true
      and zip_start <= v_delivery_zip_code
      and zip_end >= v_delivery_zip_code
    order by fee asc
    limit 1;

    if not found then
      raise exception 'Ainda nao entregamos neste CEP.';
    end if;

    v_shipping_fee := case
      when v_delivery_zone.free_shipping_min_subtotal is not null
        and v_subtotal >= v_delivery_zone.free_shipping_min_subtotal then 0
      else v_delivery_zone.fee
    end;
    v_delivery_zone_name := v_delivery_zone.name;
    v_delivery_estimate_days := v_delivery_zone.estimate_days;
  else
    v_delivery_zip_code := null;
  end if;

  v_total := (v_subtotal - v_discount + v_shipping_fee)::numeric(10, 2);

  insert into public.orders (
    user_id, status, total_amount, delivery_type, payment_method, delivery_address,
    discount_amount, subtotal_amount, promotion_code, delivery_zip_code,
    delivery_zone_name, delivery_estimate_days, shipping_fee, customer_name, customer_phone
  ) values (
    v_user_id, 'pending', v_total, p_delivery_method, p_payment_method, p_delivery_address,
    v_discount, v_subtotal, v_promotion_code, v_delivery_zip_code,
    v_delivery_zone_name, v_delivery_estimate_days, v_shipping_fee,
    nullif(trim(coalesce(p_customer_name, '')), ''),
    nullif(trim(coalesce(p_customer_phone, '')), '')
  ) returning id into v_order_id;

  insert into public.order_items (
    order_id, wine_id, product_id, product_name, quantity, unit_price,
    base_unit_price, discount_percent, product_promotion_id
  )
  select v_order_id, null, checkout_items.product_id,
         coalesce(checkout_items.requested_name, catalog_products.nome), checkout_items.quantity,
         catalog_products.effective_price, catalog_products.base_price,
         catalog_products.discount_percent, catalog_products.promotion_id
  from checkout_items
  join public.catalog_products on catalog_products.id = checkout_items.product_id;

  for v_item in
    select checkout_items.product_id, trim(product.sku_sankhya) as product_code, checkout_items.quantity
    from checkout_items
    join public.produtos as product on product.id = checkout_items.product_id
  loop
    update public.stock_levels
      set quantity = quantity - v_item.quantity, updated_at = now(), source = 'order'
      where product_code = v_item.product_code and quantity >= v_item.quantity;
    get diagnostics v_updated_count = row_count;
    if v_updated_count <> 1 then
      raise exception 'Estoque insuficiente para concluir o pedido.';
    end if;
    update public.produtos set estoque = greatest(estoque - v_item.quantity, 0)
    where id = v_item.product_id;
  end loop;

  update public.orders set stock_reserved_at = now() where id = v_order_id;
  return v_order_id;
end;
$$;

revoke all on function app_private.create_order_with_stock_reservation(
  jsonb, text, text, text, text, text, text, text
) from public, anon, authenticated;

notify pgrst, 'reload schema';
