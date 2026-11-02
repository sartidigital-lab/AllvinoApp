-- Apply the provisional PIX incentive on the server so the client cannot
-- choose or forge the order total. Existing pickup and coupon discounts are
-- preserved; the combined discount can never exceed the order subtotal.
create or replace function app_private.apply_pix_checkout_discount()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_subtotal numeric(10, 2) := greatest(0, coalesce(new.subtotal_amount, 0));
  v_existing_discount numeric(10, 2) := greatest(0, coalesce(new.discount_amount, 0));
  v_pix_discount numeric(10, 2);
begin
  if new.payment_method <> 'Pix' then
    return new;
  end if;

  v_pix_discount := (v_subtotal * 0.1)::numeric(10, 2);
  new.discount_amount := least(v_subtotal, v_existing_discount + v_pix_discount)::numeric(10, 2);
  new.total_amount := (
    v_subtotal
    - new.discount_amount
    + greatest(0, coalesce(new.shipping_fee, 0))
  )::numeric(10, 2);

  return new;
end;
$$;

revoke all on function app_private.apply_pix_checkout_discount() from public, anon, authenticated;

drop trigger if exists apply_pix_checkout_discount on public.orders;
create trigger apply_pix_checkout_discount
  before insert on public.orders
  for each row execute function app_private.apply_pix_checkout_discount();

notify pgrst, 'reload schema';
