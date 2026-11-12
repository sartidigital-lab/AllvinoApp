-- Store the customer's marketing choice with the order. A payment webhook does
-- not have access to the browser cookie, so this is the authoritative signal
-- for whether a server-side Meta Purchase event may be sent.
alter table public.orders
  add column if not exists marketing_consent_at timestamptz,
  add column if not exists meta_purchase_sent_at timestamptz,
  add column if not exists meta_purchase_event_id text;

-- Keep the existing private checkout implementation intact and add a new
-- public signature that records consent in the same transaction as the order.
create or replace function public.create_order_with_stock_reservation(
  p_cart_items jsonb,
  p_delivery_method text,
  p_payment_method text default null,
  p_delivery_address text default null,
  p_promotion_code text default null,
  p_delivery_zip_code text default null,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_marketing_consent boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  v_order_id := app_private.create_order_with_stock_reservation(
    p_cart_items,
    p_delivery_method,
    p_payment_method,
    p_delivery_address,
    p_promotion_code,
    p_delivery_zip_code,
    p_customer_name,
    p_customer_phone
  );

  if p_marketing_consent then
    update public.orders
      set marketing_consent_at = now()
      where id = v_order_id and user_id = auth.uid();
  end if;

  return v_order_id;
end;
$$;

revoke all on function public.create_order_with_stock_reservation(
  jsonb, text, text, text, text, text, text, text, boolean
) from public, anon, authenticated;

grant execute on function public.create_order_with_stock_reservation(
  jsonb, text, text, text, text, text, text, text, boolean
) to authenticated;

notify pgrst, 'reload schema';
