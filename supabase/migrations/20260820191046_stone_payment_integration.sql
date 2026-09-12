create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  provider text not null default 'pagarme' check (provider = 'pagarme'),
  method text not null check (method in ('credit_card', 'pix')),
  status text not null default 'processing'
    check (status in ('processing', 'waiting_payment', 'authorized', 'paid', 'failed', 'refunded', 'cancelled', 'unknown')),
  amount_cents integer not null check (amount_cents > 0),
  installments integer not null default 1 check (installments between 1 and 12),
  capture_mode text not null default 'immediate' check (capture_mode in ('immediate', 'authorize')),
  provider_order_id text,
  provider_charge_id text,
  provider_transaction_id text,
  pix_qr_code text,
  pix_qr_code_url text,
  expires_at timestamptz,
  last_error_code text,
  last_error_message text,
  provider_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payment_transactions_active_order_idx
  on public.payment_transactions (order_id, provider)
  where status in ('processing', 'waiting_payment', 'authorized', 'paid', 'unknown');

create unique index payment_transactions_provider_order_idx
  on public.payment_transactions (provider_order_id)
  where provider_order_id is not null;

create unique index payment_transactions_provider_charge_idx
  on public.payment_transactions (provider_charge_id)
  where provider_charge_id is not null;

create index payment_transactions_user_created_idx
  on public.payment_transactions (user_id, created_at desc);

create table public.stored_payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'pagarme' check (provider = 'pagarme'),
  provider_customer_id text not null,
  provider_card_id text not null,
  brand text,
  last_four text not null check (last_four ~ '^[0-9]{4}$'),
  exp_month integer check (exp_month between 1 and 12),
  exp_year integer check (exp_year between 2020 and 2200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_card_id)
);

create index stored_payment_methods_user_idx
  on public.stored_payment_methods (user_id, created_at desc);

create table public.payment_webhook_events (
  event_id text primary key,
  event_type text not null,
  account_id text not null,
  payload_hash text not null,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.payment_transactions enable row level security;
alter table public.stored_payment_methods enable row level security;
alter table public.payment_webhook_events enable row level security;

create policy "Users can read own payment transactions"
  on public.payment_transactions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read own stored payment methods"
  on public.stored_payment_methods for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.payment_transactions from anon, authenticated;
revoke all on public.stored_payment_methods from anon, authenticated;
revoke all on public.payment_webhook_events from anon, authenticated;
grant select on public.payment_transactions to authenticated;
grant select on public.stored_payment_methods to authenticated;

create or replace function app_private.begin_stone_payment(
  p_attempt_id uuid,
  p_order_id uuid,
  p_user_id uuid,
  p_method text,
  p_installments integer,
  p_capture_mode text
)
returns public.payment_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_transaction public.payment_transactions%rowtype;
begin
  select * into v_order
  from public.orders
  where id = p_order_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Pedido nao encontrado.';
  end if;

  if v_order.payment_status in ('paid', 'refunded') then
    raise exception 'Pedido ja possui pagamento concluido.';
  end if;

  if (p_method = 'pix' and v_order.payment_method <> 'Pix')
    or (p_method = 'credit_card' and v_order.payment_method <> 'Cartao (Link)') then
    raise exception 'Forma de pagamento nao corresponde ao pedido.';
  end if;

  select * into v_transaction
  from public.payment_transactions
  where order_id = p_order_id
    and provider = 'pagarme'
    and status in ('processing', 'waiting_payment', 'authorized', 'paid', 'unknown')
  order by created_at desc
  limit 1;

  if found then
    if v_transaction.method <> p_method then
      raise exception 'Pedido possui outra cobranca em andamento.';
    end if;
    return v_transaction;
  end if;

  insert into public.payment_transactions (
    id, order_id, user_id, method, status, amount_cents, installments, capture_mode
  ) values (
    p_attempt_id,
    p_order_id,
    p_user_id,
    p_method,
    'processing',
    round(v_order.total_amount * 100)::integer,
    p_installments,
    p_capture_mode
  )
  returning * into v_transaction;

  update public.orders
  set payment_provider = 'pagarme',
      payment_status = 'pending',
      payment_error = null
  where id = p_order_id;

  return v_transaction;
end;
$$;

create or replace function app_private.complete_stone_payment(
  p_transaction_id uuid,
  p_status text,
  p_provider_order_id text default null,
  p_provider_charge_id text default null,
  p_provider_transaction_id text default null,
  p_pix_qr_code text default null,
  p_pix_qr_code_url text default null,
  p_expires_at timestamptz default null,
  p_error_code text default null,
  p_error_message text default null,
  p_provider_updated_at timestamptz default null
)
returns public.payment_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction public.payment_transactions%rowtype;
  v_order_payment_status text;
begin
  if p_status not in ('processing', 'waiting_payment', 'authorized', 'paid', 'failed', 'refunded', 'cancelled', 'unknown') then
    raise exception 'Status de pagamento invalido.';
  end if;

  update public.payment_transactions
  set status = p_status,
      provider_order_id = coalesce(p_provider_order_id, provider_order_id),
      provider_charge_id = coalesce(p_provider_charge_id, provider_charge_id),
      provider_transaction_id = coalesce(p_provider_transaction_id, provider_transaction_id),
      pix_qr_code = coalesce(p_pix_qr_code, pix_qr_code),
      pix_qr_code_url = coalesce(p_pix_qr_code_url, pix_qr_code_url),
      expires_at = coalesce(p_expires_at, expires_at),
      last_error_code = p_error_code,
      last_error_message = p_error_message,
      provider_updated_at = coalesce(p_provider_updated_at, provider_updated_at),
      updated_at = now()
  where id = p_transaction_id
  returning * into v_transaction;

  if not found then
    raise exception 'Transacao nao encontrada.';
  end if;

  v_order_payment_status := case p_status
    when 'waiting_payment' then 'pending'
    when 'processing' then 'pending'
    when 'unknown' then 'pending'
    when 'authorized' then 'authorized'
    when 'paid' then 'paid'
    when 'failed' then 'failed'
    when 'refunded' then 'refunded'
    when 'cancelled' then 'cancelled'
  end;

  update public.orders
  set payment_provider = 'pagarme',
      payment_status = v_order_payment_status,
      payment_reference = coalesce(p_provider_charge_id, p_provider_order_id, payment_reference),
      payment_url = coalesce(p_pix_qr_code_url, payment_url),
      paid_at = case when p_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
      payment_error = p_error_message,
      status = case when p_status = 'paid' and status = 'pending' then 'confirmed' else status end
  where id = v_transaction.order_id;

  return v_transaction;
end;
$$;

create or replace function app_private.process_stone_webhook(
  p_event_id text,
  p_event_type text,
  p_account_id text,
  p_payload_hash text,
  p_status text,
  p_order_code text default null,
  p_provider_order_id text default null,
  p_provider_charge_id text default null,
  p_provider_transaction_id text default null,
  p_provider_event_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction public.payment_transactions%rowtype;
  v_inserted integer;
begin
  insert into public.payment_webhook_events (event_id, event_type, account_id, payload_hash)
  values (p_event_id, p_event_type, p_account_id, p_payload_hash)
  on conflict (event_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return 'duplicate';
  end if;

  if p_status is null then
    update public.payment_webhook_events
    set processing_status = 'ignored', processed_at = now()
    where event_id = p_event_id;
    return 'ignored';
  end if;

  select * into v_transaction
  from public.payment_transactions
  where (p_provider_order_id is not null and provider_order_id = p_provider_order_id)
     or (p_provider_charge_id is not null and provider_charge_id = p_provider_charge_id)
     or (
       order_id = case
         when p_order_code ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
           then p_order_code::uuid
         else null
       end
     )
  order by created_at desc
  limit 1
  for update;

  if not found then
    update public.payment_webhook_events
    set processing_status = 'ignored', processed_at = now()
    where event_id = p_event_id;
    return 'ignored';
  end if;

  if p_provider_event_at is not null
    and v_transaction.provider_updated_at is not null
    and p_provider_event_at < v_transaction.provider_updated_at then
    update public.payment_webhook_events
    set processing_status = 'ignored', processed_at = now()
    where event_id = p_event_id;
    return 'stale';
  end if;

  if v_transaction.status = 'refunded'
    or (v_transaction.status = 'paid' and p_status not in ('paid', 'refunded')) then
    p_status := v_transaction.status;
  end if;

  perform app_private.complete_stone_payment(
    v_transaction.id,
    p_status,
    p_provider_order_id,
    p_provider_charge_id,
    p_provider_transaction_id,
    null,
    null,
    null,
    null,
    null,
    p_provider_event_at
  );

  update public.payment_webhook_events
  set processing_status = 'processed', processed_at = now()
  where event_id = p_event_id;

  return 'processed';
exception when others then
  update public.payment_webhook_events
  set processing_status = 'failed', error_message = left(sqlerrm, 500), processed_at = now()
  where event_id = p_event_id;
  raise;
end;
$$;

revoke all on function app_private.begin_stone_payment(uuid, uuid, uuid, text, integer, text) from public, anon, authenticated;
revoke all on function app_private.complete_stone_payment(uuid, text, text, text, text, text, text, timestamptz, text, text, timestamptz) from public, anon, authenticated;
revoke all on function app_private.process_stone_webhook(text, text, text, text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
grant usage on schema app_private to service_role;
grant execute on function app_private.begin_stone_payment(uuid, uuid, uuid, text, integer, text) to service_role;
grant execute on function app_private.complete_stone_payment(uuid, text, text, text, text, text, text, timestamptz, text, text, timestamptz) to service_role;
grant execute on function app_private.process_stone_webhook(text, text, text, text, text, text, text, text, text, timestamptz) to service_role;

-- PostgREST only exposes the public schema. These wrappers remain callable
-- exclusively with the server-side service role.
create or replace function public.begin_stone_payment(
  p_attempt_id uuid,
  p_order_id uuid,
  p_user_id uuid,
  p_method text,
  p_installments integer,
  p_capture_mode text
)
returns public.payment_transactions
language sql
security definer
set search_path = ''
as $$
  select app_private.begin_stone_payment(
    p_attempt_id, p_order_id, p_user_id, p_method, p_installments, p_capture_mode
  );
$$;

create or replace function public.complete_stone_payment(
  p_transaction_id uuid,
  p_status text,
  p_provider_order_id text default null,
  p_provider_charge_id text default null,
  p_provider_transaction_id text default null,
  p_pix_qr_code text default null,
  p_pix_qr_code_url text default null,
  p_expires_at timestamptz default null,
  p_error_code text default null,
  p_error_message text default null,
  p_provider_updated_at timestamptz default null
)
returns public.payment_transactions
language sql
security definer
set search_path = ''
as $$
  select app_private.complete_stone_payment(
    p_transaction_id, p_status, p_provider_order_id, p_provider_charge_id,
    p_provider_transaction_id, p_pix_qr_code, p_pix_qr_code_url, p_expires_at,
    p_error_code, p_error_message, p_provider_updated_at
  );
$$;

create or replace function public.process_stone_webhook(
  p_event_id text,
  p_event_type text,
  p_account_id text,
  p_payload_hash text,
  p_status text,
  p_order_code text default null,
  p_provider_order_id text default null,
  p_provider_charge_id text default null,
  p_provider_transaction_id text default null,
  p_provider_event_at timestamptz default null
)
returns text
language sql
security definer
set search_path = ''
as $$
  select app_private.process_stone_webhook(
    p_event_id, p_event_type, p_account_id, p_payload_hash, p_status,
    p_order_code, p_provider_order_id, p_provider_charge_id,
    p_provider_transaction_id, p_provider_event_at
  );
$$;

revoke all on function public.begin_stone_payment(uuid, uuid, uuid, text, integer, text) from public, anon, authenticated;
revoke all on function public.complete_stone_payment(uuid, text, text, text, text, text, text, timestamptz, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.process_stone_webhook(text, text, text, text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.begin_stone_payment(uuid, uuid, uuid, text, integer, text) to service_role;
grant execute on function public.complete_stone_payment(uuid, text, text, text, text, text, text, timestamptz, text, text, timestamptz) to service_role;
grant execute on function public.process_stone_webhook(text, text, text, text, text, text, text, text, text, timestamptz) to service_role;

notify pgrst, 'reload schema';

;


