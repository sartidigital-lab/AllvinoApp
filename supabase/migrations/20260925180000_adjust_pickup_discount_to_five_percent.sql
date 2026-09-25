-- The checkout RPC previously applies 10% for pickup. Adjust the persisted
-- amount before the existing PIX trigger runs, preserving any coupon discount.
create or replace function app_private.adjust_pickup_checkout_discount()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.delivery_type = 'Retirada na Loja' then
    new.discount_amount := greatest(0, coalesce(new.discount_amount, 0) - (coalesce(new.subtotal_amount, 0) * 0.05))::numeric(10, 2);
    new.total_amount := (coalesce(new.total_amount, 0) + (coalesce(new.subtotal_amount, 0) * 0.05))::numeric(10, 2);
  end if;
  return new;
end;
$$;

revoke all on function app_private.adjust_pickup_checkout_discount() from public, anon, authenticated;

drop trigger if exists adjust_pickup_checkout_discount on public.orders;
create trigger adjust_pickup_checkout_discount
  before insert on public.orders
  for each row execute function app_private.adjust_pickup_checkout_discount();

notify pgrst, 'reload schema';
