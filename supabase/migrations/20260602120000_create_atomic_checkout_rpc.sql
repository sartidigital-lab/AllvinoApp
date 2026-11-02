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

  if jsonb_typeof(p_cart_items) <> 'array' or jsonb_array_length(p_cart_items) = 0 then
    raise exception 'Pedido invalido.';
  end if;

  create temp table if not exists checkout_items (
    product_id uuid primary key,
    requested_name text,
    quantity integer not null check (quantity > 0)
  ) on commit drop;

  truncate table checkout_items;

  insert into checkout_items (product_id, requested_name, quantity)
  select
    parsed.product_id,
    max(parsed.requested_name),
    sum(parsed.quantity)::integer
  from (
    select
      item.id::uuid as product_id,
      nullif(trim(item.name), '') as requested_name,
      greatest(1, coalesce(item.quantity, 1))::integer as quantity
    from jsonb_to_recordset(p_cart_items) as item(id text, name text, quantity numeric)
  ) parsed
  group by parsed.product_id;

  if not exists (select 1 from checkout_items) then
    raise exception 'Pedido invalido.';
  end if;

  if exists (
    select 1
    from checkout_items
    left join public.produtos on produtos.id = checkout_items.product_id
    where produtos.id is null
  ) then
    raise exception 'Nao foi possivel validar os produtos.';
  end if;

  if exists (
    select 1
    from checkout_items
    join public.produtos on produtos.id = checkout_items.product_id
    where nullif(trim(produtos.sku_sankhya), '') is null
  ) then
    raise exception 'Produto sem codigo de estoque.';
  end if;

  if exists (
    select 1
    from checkout_items
    join public.produtos on produtos.id = checkout_items.product_id
    left join public.stock_levels on stock_levels.product_code = trim(produtos.sku_sankhya)
    where coalesce(stock_levels.quantity, -1) < checkout_items.quantity
  ) then
    raise exception 'Estoque insuficiente para concluir o pedido.';
  end if;

  select coalesce(sum(checkout_items.quantity * produtos.preco), 0)::numeric(10, 2)
    into v_subtotal
  from checkout_items
  join public.produtos on produtos.id = checkout_items.product_id;

  if p_delivery_method = 'Retirada na Loja' then
    v_pickup_discount := (v_subtotal * 0.1)::numeric(10, 2);
  end if;

  if v_promotion_code <> '' then
    select *
      into v_promotion
    from public.promotions
    where code = v_promotion_code
      and is_active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    limit 1;

    if not found then
      raise exception 'Cupom invalido ou expirado.';
    end if;

    if v_subtotal < v_promotion.min_subtotal then
      raise exception 'Cupom nao atende ao valor minimo do pedido.';
    end if;

    v_promotion_discount :=
      case
        when v_promotion.discount_type = 'percent' then v_subtotal * (v_promotion.discount_value / 100)
        else v_promotion.discount_value
      end;

    if v_promotion.max_discount is not null then
      v_promotion_discount := least(v_promotion_discount, v_promotion.max_discount);
    end if;

    v_promotion_discount := least(v_subtotal, greatest(0, v_promotion_discount))::numeric(10, 2);
  else
    v_promotion_code := null;
  end if;

  v_discount := least(v_subtotal, v_pickup_discount + v_promotion_discount)::numeric(10, 2);

  if p_delivery_method = 'Entrega no Endereco' then
    if length(v_delivery_zip_code) <> 8 then
      raise exception 'Informe um CEP valido para entrega.';
    end if;

    select *
      into v_delivery_zone
    from public.delivery_zones
    where is_active = true
      and zip_start <= v_delivery_zip_code
      and zip_end >= v_delivery_zip_code
    order by fee asc
    limit 1;

    if not found then
      raise exception 'Ainda nao entregamos neste CEP.';
    end if;

    v_shipping_fee :=
      case
        when v_delivery_zone.free_shipping_min_subtotal is not null
          and v_subtotal >= v_delivery_zone.free_shipping_min_subtotal
          then 0
        else v_delivery_zone.fee
      end;
    v_delivery_zone_name := v_delivery_zone.name;
    v_delivery_estimate_days := v_delivery_zone.estimate_days;
  else
    v_delivery_zip_code := null;
  end if;

  v_total := (v_subtotal - v_discount + v_shipping_fee)::numeric(10, 2);

  insert into public.orders (
    user_id,
    status,
    total_amount,
    delivery_type,
    payment_method,
    delivery_address,
    discount_amount,
    subtotal_amount,
    promotion_code,
    delivery_zip_code,
    delivery_zone_name,
    delivery_estimate_days,
    shipping_fee,
    customer_name,
    customer_phone
  )
  values (
    v_user_id,
    'pending',
    v_total,
    p_delivery_method,
    p_payment_method,
    p_delivery_address,
    v_discount,
    v_subtotal,
    v_promotion_code,
    v_delivery_zip_code,
    v_delivery_zone_name,
    v_delivery_estimate_days,
    v_shipping_fee,
    nullif(trim(coalesce(p_customer_name, '')), ''),
    nullif(trim(coalesce(p_customer_phone, '')), '')
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id,
    wine_id,
    product_id,
    product_name,
    quantity,
    unit_price
  )
  select
    v_order_id,
    null,
    checkout_items.product_id,
    coalesce(checkout_items.requested_name, produtos.nome),
    checkout_items.quantity,
    produtos.preco
  from checkout_items
  join public.produtos on produtos.id = checkout_items.product_id;

  for v_item in
    select
      checkout_items.product_id,
      trim(produtos.sku_sankhya) as product_code,
      checkout_items.quantity
    from checkout_items
    join public.produtos on produtos.id = checkout_items.product_id
  loop
    update public.stock_levels
      set quantity = quantity - v_item.quantity,
          updated_at = now(),
          source = 'order'
      where product_code = v_item.product_code
        and quantity >= v_item.quantity;

    get diagnostics v_updated_count = row_count;

    if v_updated_count <> 1 then
      raise exception 'Estoque insuficiente para concluir o pedido.';
    end if;

    update public.produtos
      set estoque = greatest(estoque - v_item.quantity, 0)
      where id = v_item.product_id;
  end loop;

  update public.orders
    set stock_reserved_at = now()
    where id = v_order_id;

  return v_order_id;
end;
$$;

revoke all on function app_private.create_order_with_stock_reservation(
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public;

grant usage on schema app_private to authenticated;
grant execute on function app_private.create_order_with_stock_reservation(
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;

create or replace function public.create_order_with_stock_reservation(
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
language sql
as $$
  select app_private.create_order_with_stock_reservation(
    p_cart_items,
    p_delivery_method,
    p_payment_method,
    p_delivery_address,
    p_promotion_code,
    p_delivery_zip_code,
    p_customer_name,
    p_customer_phone
  );
$$;

revoke all on function public.create_order_with_stock_reservation(
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public;

grant execute on function public.create_order_with_stock_reservation(
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;

notify pgrst, 'reload schema';
