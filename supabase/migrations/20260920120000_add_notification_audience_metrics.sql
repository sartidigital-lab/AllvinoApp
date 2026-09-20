alter table public.push_subscriptions
  add column if not exists device_type text not null default 'unknown';

alter table public.push_subscriptions
  drop constraint if exists push_device_type_check;

alter table public.push_subscriptions
  add constraint push_device_type_check
  check (device_type in ('desktop', 'mobile', 'unknown'));

create index if not exists push_subscriptions_user_device_type_idx
  on public.push_subscriptions (user_id, device_type);

create index if not exists orders_user_created_at_active_idx
  on public.orders (user_id, created_at desc)
  where status <> 'cancelled';

create or replace function app_private.get_notification_audience(
  p_ticket_min numeric default null,
  p_ticket_max numeric default null
)
returns table(
  user_id uuid,
  user_name text,
  user_email text,
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
    select
      orders.user_id,
      max(orders.created_at) as last_order_at,
      avg(orders.total_amount)::numeric(12, 2) as average_order_ticket
    from public.orders
    where orders.user_id is not null
      and orders.status <> 'cancelled'
    group by orders.user_id
  ),
  bottle_stats as (
    select
      orders.user_id,
      avg(order_items.unit_price)::numeric(12, 2) as average_bottle_price
    from public.orders
    join public.order_items on order_items.order_id = orders.id
    where orders.user_id is not null
      and orders.status <> 'cancelled'
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
    coalesce(nullif(account.raw_user_meta_data ->> 'nome_completo', ''), nullif(profile.nome, ''), split_part(account.email, '@', 1), 'Usuário sem nome') as user_name,
    account.email as user_email,
    account.created_at as registered_at,
    coalesce(subscription.device_count, 0) > 0 as notifications_enabled,
    coalesce(subscription.device_count, 0) as device_count,
    coalesce(subscription.device_types, array[]::text[]) as device_types,
    order_summary.user_id is not null as has_orders,
    order_summary.last_order_at,
    greatest(
      0,
      floor(extract(epoch from now() - coalesce(order_summary.last_order_at, account.created_at)) / 86400)::integer
    ) as days_without_purchase,
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

create or replace function public.get_notification_audience(
  p_ticket_min numeric default null,
  p_ticket_max numeric default null
)
returns table(
  user_id uuid,
  user_name text,
  user_email text,
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

notify pgrst, 'reload schema';
