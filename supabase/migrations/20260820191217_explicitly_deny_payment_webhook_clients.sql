create policy "Clients cannot access payment webhook events"
  on public.payment_webhook_events
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);;


