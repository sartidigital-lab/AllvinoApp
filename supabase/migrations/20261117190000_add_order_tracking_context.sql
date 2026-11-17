-- Browser identifiers (fbp, fbc, GA client/session id, IP, user agent) captured
-- when the order is created, only for the cookie categories the visitor
-- accepted. The payment webhook has no browser, so it reads them from here to
-- report the sale to Meta (Conversions API) and Google Analytics 4.
alter table public.orders
  add column if not exists tracking_context jsonb,
  add column if not exists ga4_purchase_sent_at timestamptz;

comment on column public.orders.tracking_context is
  'Consent-gated browser identifiers used for server-side Purchase events.';
comment on column public.orders.ga4_purchase_sent_at is
  'When the GA4 purchase event was sent through the Measurement Protocol.';
