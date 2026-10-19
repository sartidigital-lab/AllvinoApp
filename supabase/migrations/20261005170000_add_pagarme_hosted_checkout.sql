-- Pagar.me is Stone's online payments platform. Keep every provider operation
-- server-only; browser clients receive only the hosted checkout URL.
alter table public.payment_transactions
  add column if not exists provider_payment_link_id text,
  add column if not exists provider_payment_url text;

create unique index if not exists payment_transactions_provider_payment_link_idx
  on public.payment_transactions (provider_payment_link_id)
  where provider_payment_link_id is not null;

create or replace function app_private.prevent_unpaid_pagarme_fulfillment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.payment_provider = 'pagarme'
    and new.status in ('confirmed', 'preparing', 'delivered')
    and new.payment_status <> 'paid' then
    raise exception 'Pagamento online precisa estar pago antes da separacao ou entrega.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_unpaid_pagarme_fulfillment on public.orders;
create trigger prevent_unpaid_pagarme_fulfillment
  before update of status, payment_provider, payment_status on public.orders
  for each row execute function app_private.prevent_unpaid_pagarme_fulfillment();

revoke all on function app_private.prevent_unpaid_pagarme_fulfillment() from public, anon, authenticated;

create or replace function app_private.begin_pagarme_payment(
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

  if v_order.status = 'cancelled' or v_order.payment_status in ('paid', 'refunded') then
    raise exception 'Pedido nao esta disponivel para pagamento.';
  end if;

  if (p_method = 'pix' and v_order.payment_method <> 'Pix')
    or (p_method = 'credit_card' and v_order.payment_method <> 'Cartao (Link)')
    or p_method not in ('pix', 'credit_card') then
    raise exception 'Forma de pagamento nao corresponde ao pedido.';
  end if;

  if p_installments < 1 or p_installments > 3 then
    raise exception 'Parcelamento invalido.';
  end if;

  select * into v_transaction
  from public.payment_transactions
  where order_id = p_order_id
    and provider = 'pagarme'
    and status in ('processing', 'waiting_payment', 'authorized', 'paid', 'unknown')
  order by created_at desc
  limit 1
  for update;

  if found then
    if v_transaction.method <> p_method then
      raise exception 'Pedido possui outra cobranca em andamento.';
    end if;
    return v_transaction;
  end if;

  insert into public.payment_transactions (
    id, order_id, user_id, provider, method, status, amount_cents, installments, capture_mode
  ) values (
    p_attempt_id, p_order_id, p_user_id, 'pagarme', p_method, 'processing',
    round(v_order.total_amount * 100)::integer, p_installments, p_capture_mode
  )
  returning * into v_transaction;

  update public.orders
  set payment_provider = 'pagarme', payment_status = 'pending', payment_error = null
  where id = p_order_id;

  return v_transaction;
end;
$$;

create or replace function app_private.complete_pagarme_payment(
  p_transaction_id uuid,
  p_status text,
  p_provider_order_id text default null,
  p_provider_charge_id text default null,
  p_provider_transaction_id text default null,
  p_provider_payment_link_id text default null,
  p_payment_url text default null,
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
      provider_payment_link_id = coalesce(p_provider_payment_link_id, provider_payment_link_id),
      provider_payment_url = coalesce(p_payment_url, provider_payment_url),
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
    when 'authorized' then 'authorized'
    when 'paid' then 'paid'
    when 'failed' then 'failed'
    when 'refunded' then 'refunded'
    when 'cancelled' then 'cancelled'
    else 'pending'
  end;

  update public.orders
  set payment_provider = 'pagarme',
      payment_status = v_order_payment_status,
      payment_reference = coalesce(p_provider_charge_id, p_provider_order_id, p_provider_payment_link_id, payment_reference),
      payment_url = coalesce(p_payment_url, payment_url),
      paid_at = case when p_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
      payment_error = p_error_message,
      status = case when p_status = 'paid' and status = 'pending' then 'confirmed' else status end
  where id = v_transaction.order_id;

  return v_transaction;
end;
$$;

create or replace function app_private.process_pagarme_webhook(
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

  if v_inserted = 0 then return 'duplicate'; end if;

  if p_status is null then
    update public.payment_webhook_events
    set processing_status = 'ignored', processed_at = now()
    where event_id = p_event_id;
    return 'ignored';
  end if;

  select * into v_transaction
  from public.payment_transactions
  where provider = 'pagarme'
    and (
      (p_provider_order_id is not null and provider_order_id = p_provider_order_id)
      or (p_provider_charge_id is not null and provider_charge_id = p_provider_charge_id)
      or (p_order_code ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          and order_id = p_order_code::uuid)
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

  perform app_private.complete_pagarme_payment(
    v_transaction.id, p_status, p_provider_order_id, p_provider_charge_id,
    p_provider_transaction_id, null, null, null, null, null, p_provider_event_at
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

create or replace function public.begin_pagarme_payment(
  p_attempt_id uuid, p_order_id uuid, p_user_id uuid, p_method text, p_installments integer, p_capture_mode text
)
returns public.payment_transactions
language sql
security definer
set search_path = ''
as $$
  select app_private.begin_pagarme_payment(
    p_attempt_id, p_order_id, p_user_id, p_method, p_installments, p_capture_mode
  );
$$;

create or replace function public.complete_pagarme_payment(
  p_transaction_id uuid, p_status text, p_provider_order_id text default null,
  p_provider_charge_id text default null, p_provider_transaction_id text default null,
  p_provider_payment_link_id text default null, p_payment_url text default null,
  p_expires_at timestamptz default null, p_error_code text default null,
  p_error_message text default null, p_provider_updated_at timestamptz default null
)
returns public.payment_transactions
language sql
security definer
set search_path = ''
as $$
  select app_private.complete_pagarme_payment(
    p_transaction_id, p_status, p_provider_order_id, p_provider_charge_id,
    p_provider_transaction_id, p_provider_payment_link_id, p_payment_url,
    p_expires_at, p_error_code, p_error_message, p_provider_updated_at
  );
$$;

create or replace function public.process_pagarme_webhook(
  p_event_id text, p_event_type text, p_account_id text, p_payload_hash text, p_status text,
  p_order_code text default null, p_provider_order_id text default null,
  p_provider_charge_id text default null, p_provider_transaction_id text default null,
  p_provider_event_at timestamptz default null
)
returns text
language sql
security definer
set search_path = ''
as $$
  select app_private.process_pagarme_webhook(
    p_event_id, p_event_type, p_account_id, p_payload_hash, p_status, p_order_code,
    p_provider_order_id, p_provider_charge_id, p_provider_transaction_id, p_provider_event_at
  );
$$;

revoke all on function app_private.begin_pagarme_payment(uuid, uuid, uuid, text, integer, text) from public, anon, authenticated;
revoke all on function app_private.complete_pagarme_payment(uuid, text, text, text, text, text, text, timestamptz, text, text, timestamptz) from public, anon, authenticated;
revoke all on function app_private.process_pagarme_webhook(text, text, text, text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
grant usage on schema app_private to service_role;
grant execute on function app_private.begin_pagarme_payment(uuid, uuid, uuid, text, integer, text) to service_role;
grant execute on function app_private.complete_pagarme_payment(uuid, text, text, text, text, text, text, timestamptz, text, text, timestamptz) to service_role;
grant execute on function app_private.process_pagarme_webhook(text, text, text, text, text, text, text, text, text, timestamptz) to service_role;

revoke all on function public.begin_pagarme_payment(uuid, uuid, uuid, text, integer, text) from public, anon, authenticated;
revoke all on function public.complete_pagarme_payment(uuid, text, text, text, text, text, text, timestamptz, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.process_pagarme_webhook(text, text, text, text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.begin_pagarme_payment(uuid, uuid, uuid, text, integer, text) to service_role;
grant execute on function public.complete_pagarme_payment(uuid, text, text, text, text, text, text, timestamptz, text, text, timestamptz) to service_role;
grant execute on function public.process_pagarme_webhook(text, text, text, text, text, text, text, text, text, timestamptz) to service_role;

notify pgrst, 'reload schema';
