alter function public.get_stock_levels_for_codes(text[])
  set search_path = public, pg_temp;

alter function public.reserve_product_stock_for_order(uuid)
  set search_path = public, pg_temp;

alter function public.create_order_with_stock_reservation(jsonb, text, text, text, text, text, text, text)
  set search_path = public, pg_temp;

-- Public buckets keep direct object URL access, but clients do not need to
-- list every object in the bucket.
drop policy if exists "Public can read product images" on storage.objects;
drop policy if exists "wine_images_public_read" on storage.objects;

notify pgrst, 'reload schema';
