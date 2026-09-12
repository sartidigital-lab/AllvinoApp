-- The current checkout uses manual PIX confirmation and WhatsApp-assisted card
-- payment. The Pagar.me/Stone tables are not consumed by the app yet, so keep
-- them private until a signed webhook integration is deployed.
drop policy if exists "Users can read own payment transactions" on public.payment_transactions;
drop policy if exists "Users can read own stored payment methods" on public.stored_payment_methods;

revoke all on public.payment_transactions from anon, authenticated;
revoke all on public.stored_payment_methods from anon, authenticated;
revoke all on public.payment_provider_customers from anon, authenticated;
revoke all on public.payment_webhook_events from anon, authenticated;

notify pgrst, 'reload schema';
