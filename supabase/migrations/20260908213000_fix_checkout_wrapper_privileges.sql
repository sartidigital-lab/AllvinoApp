-- The public checkout RPC is the only callable entrypoint for clients. Its
-- implementation lives in app_private and is intentionally not executable by
-- authenticated users. Run this narrow wrapper with owner privileges so it can
-- cross that boundary without exposing the private function directly.
alter function public.create_order_with_stock_reservation(
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
  security definer
  set search_path = '';

revoke all on function public.create_order_with_stock_reservation(
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.create_order_with_stock_reservation(
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;

notify pgrst, 'reload schema';
