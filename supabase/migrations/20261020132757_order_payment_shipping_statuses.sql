-- Keep Pagar.me payment state and manual fulfillment state aligned.
-- A canceled unpaid payment cancels the order; a paid order can advance only
-- after the payment provider has confirmed payment.
create or replace function app_private.prevent_unpaid_pagarme_fulfillment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.payment_provider = 'pagarme'
    and new.payment_status = 'cancelled'
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

drop trigger if exists prevent_unpaid_pagarme_fulfillment on public.orders;
create trigger prevent_unpaid_pagarme_fulfillment
  before update of status, payment_provider, payment_status on public.orders
  for each row execute function app_private.prevent_unpaid_pagarme_fulfillment();

revoke all on function app_private.prevent_unpaid_pagarme_fulfillment() from public, anon, authenticated;

notify pgrst, 'reload schema';
