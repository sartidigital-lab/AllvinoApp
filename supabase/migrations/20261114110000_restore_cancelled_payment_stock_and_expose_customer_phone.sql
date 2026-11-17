-- Surface the opted contact number to administrators only. The value comes
-- from Auth user metadata and remains protected by the admin-only audience RPC.
drop function if exists public.get_notification_audience(numeric, numeric);
drop function if exists app_private.get_notification_audience(numeric, numeric);

create function app_private.get_notification_audience(
  p_ticket_min numeric default null,
  p_ticket_max numeric default null
)
returns table(
  user_id uuid,
  user_name text,
  user_email text,
  user_phone text,
  registered_at timestamptz,
  notifications_enabled boolean,
  device_count integer,
  device_types text[],
  has_orders boolean,
  last_order_at timestamptz,
  days_without_purchase integer,
  average_bottle_price numeric,
  average_order_ticket numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app_private.is_admin() then
    raise exception 'Acesso restrito.' using errcode = '42501';
  end if;

  if p_ticket_min is not null and p_ticket_min < 0 then
    raise exception 'O ticket mínimo não pode ser negativo.' using errcode = '22023';
  end if;

  if p_ticket_max is not null and p_ticket_max < 0 then
    raise exception 'O ticket máximo não pode ser negativo.' using errcode = '22023';
  end if;

  if p_ticket_min is not null and p_ticket_max is not null and p_ticket_min > p_ticket_max then
    raise exception 'O ticket mínimo não pode superar o máximo.' using errcode = '22023';
  end if;

  return query
  with order_stats as (
    select orders.user_id, max(orders.created_at) as last_order_at, avg(orders.total_amount)::numeric(12, 2) as average_order_ticket
    from public.orders
    where orders.user_id is not null and orders.status <> 'cancelled'
    group by orders.user_id
  ),
  bottle_stats as (
    select orders.user_id, avg(order_items.unit_price)::numeric(12, 2) as average_bottle_price
    from public.orders
    join public.order_items on order_items.order_id = orders.id
    where orders.user_id is not null and orders.status <> 'cancelled'
    group by orders.user_id
  ),
  subscription_stats as (
    select
      push_subscriptions.user_id,
      count(push_subscriptions.id)::integer as device_count,
      coalesce(
        array_agg(distinct push_subscriptions.device_type order by push_subscriptions.device_type)
          filter (where push_subscriptions.device_type <> 'unknown'),
        array[]::text[]
      ) as device_types
    from public.push_subscriptions
    group by push_subscriptions.user_id
  )
  select
    account.id as user_id,
    coalesce(nullif(account.raw_user_meta_data ->> 'nome_completo', ''), nullif(profile.nome::text, ''), split_part(account.email::text, '@', 1), 'Usuário sem nome')::text as user_name,
    account.email::text as user_email,
    coalesce(nullif(account.raw_user_meta_data ->> 'whatsapp', ''), nullif(account.raw_user_meta_data ->> 'telefone', ''))::text as user_phone,
    account.created_at as registered_at,
    coalesce(subscription.device_count, 0) > 0 as notifications_enabled,
    coalesce(subscription.device_count, 0) as device_count,
    coalesce(subscription.device_types, array[]::text[]) as device_types,
    order_summary.user_id is not null as has_orders,
    order_summary.last_order_at,
    greatest(0, floor(extract(epoch from now() - coalesce(order_summary.last_order_at, account.created_at)) / 86400)::integer) as days_without_purchase,
    bottle_summary.average_bottle_price,
    order_summary.average_order_ticket
  from auth.users as account
  left join public.perfis as profile on profile.id = account.id
  left join order_stats as order_summary on order_summary.user_id = account.id
  left join bottle_stats as bottle_summary on bottle_summary.user_id = account.id
  left join subscription_stats as subscription on subscription.user_id = account.id
  where account.deleted_at is null
    and (account.banned_until is null or account.banned_until <= now())
    and not exists (select 1 from public.admin_users where admin_users.id = account.id)
    and (p_ticket_min is null or order_summary.average_order_ticket >= p_ticket_min)
    and (p_ticket_max is null or order_summary.average_order_ticket <= p_ticket_max)
  order by account.created_at desc;
end;
$$;

revoke all on function app_private.get_notification_audience(numeric, numeric) from public, anon;
grant execute on function app_private.get_notification_audience(numeric, numeric) to authenticated;

create function public.get_notification_audience(
  p_ticket_min numeric default null,
  p_ticket_max numeric default null
)
returns table(
  user_id uuid,
  user_name text,
  user_email text,
  user_phone text,
  registered_at timestamptz,
  notifications_enabled boolean,
  device_count integer,
  device_types text[],
  has_orders boolean,
  last_order_at timestamptz,
  days_without_purchase integer,
  average_bottle_price numeric,
  average_order_ticket numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from app_private.get_notification_audience(p_ticket_min, p_ticket_max);
$$;

revoke all on function public.get_notification_audience(numeric, numeric) from public, anon;
grant execute on function public.get_notification_audience(numeric, numeric) to authenticated;

-- A reservation is consumed only once. The release timestamp makes the
-- automatic refund of inventory safe when providers retry their webhooks.
alter table public.orders
  add column if not exists stock_released_at timestamptz;

create or replace function app_private.release_product_stock_for_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;

  if v_order.stock_reserved_at is null
    or v_order.stock_released_at is not null
    or v_order.payment_status = 'paid' then
    return;
  end if;

  for v_item in
    select
      order_items.product_id,
      trim(produtos.sku_sankhya) as product_code,
      sum(order_items.quantity)::integer as quantity
    from public.order_items
    join public.produtos on produtos.id = order_items.product_id
    where order_items.order_id = p_order_id
      and order_items.product_id is not null
    group by order_items.product_id, trim(produtos.sku_sankhya)
  loop
    if nullif(v_item.product_code, '') is null then
      raise exception 'Produto % nao possui codigo de estoque.', v_item.product_id;
    end if;

    update public.stock_levels
    set quantity = quantity + v_item.quantity,
        updated_at = now(),
        source = 'order_cancelled'
    where product_code = v_item.product_code;

    if not found then
      raise exception 'Estoque nao encontrado para o codigo %.', v_item.product_code;
    end if;

    update public.produtos
    set estoque = estoque + v_item.quantity
    where id = v_item.product_id;
  end loop;

  update public.orders
  set stock_released_at = now()
  where id = p_order_id
    and stock_released_at is null;
end;
$$;

revoke all on function app_private.release_product_stock_for_order(uuid) from public, anon, authenticated;

-- Failed payments and expired payment links must both cancel the operational
-- order before inventory can be returned.
create or replace function app_private.prevent_unpaid_pagarme_fulfillment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.payment_provider = 'pagarme'
    and new.payment_status in ('failed', 'cancelled')
    and old.payment_status not in ('paid', 'refunded')
    and new.status in ('pending', 'confirmed') then
    new.status := 'cancelled';
  end if;

  if new.payment_provider = 'pagarme'
    and new.status in ('confirmed', 'preparing', 'in_transit', 'delivered')
    and new.payment_status <> 'paid' then
    raise exception 'Pagamento online precisa estar pago antes da separacao ou entrega.';
  end if;

  return new;
end;
$$;

create or replace function app_private.release_failed_payment_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.payment_provider = 'pagarme'
    and new.status = 'cancelled'
    and old.status is distinct from 'cancelled'
    and new.payment_status in ('failed', 'cancelled') then
    perform app_private.release_product_stock_for_order(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists release_failed_payment_stock on public.orders;
create trigger release_failed_payment_stock
  after update of status, payment_status on public.orders
  for each row execute function app_private.release_failed_payment_stock();

revoke all on function app_private.prevent_unpaid_pagarme_fulfillment() from public, anon, authenticated;
revoke all on function app_private.release_failed_payment_stock() from public, anon, authenticated;

-- Repair historic Pagar.me refusals only. Pending payment links that were
-- manually cancelled remain untouched because the provider may still settle.
do $$
declare
  v_order_id uuid;
begin
  for v_order_id in
    select id
    from public.orders
    where payment_provider = 'pagarme'
      and payment_status in ('failed', 'cancelled')
      and status = 'cancelled'
      and stock_reserved_at is not null
      and stock_released_at is null
  loop
    perform app_private.release_product_stock_for_order(v_order_id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
