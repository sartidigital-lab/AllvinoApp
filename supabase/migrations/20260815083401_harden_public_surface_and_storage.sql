-- Allvino public downloads remain available through the public bucket URLs. Bucket
-- administration and uploads must still be authorized explicitly.
drop policy if exists "Acesso Total Imagens" on storage.buckets;

update storage.buckets
set file_size_limit = 8 * 1024 * 1024,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif'
    ]::text[]
where id in ('produtos', 'wine-images');

-- Permissive SELECT policies are combined with OR. Replace the two legacy
-- policies so active but unpublished wines cannot leak through the summary view.
drop policy if exists "Public can read published wines" on public.wines;
drop policy if exists "wines_public_read" on public.wines;

create policy "Public can read active published wines"
  on public.wines for select
  to anon, authenticated
  using (ativo = true and publicado = true);

-- These RPCs are never valid for anonymous callers. Their internal checks stay
-- in place as a second authorization layer for authenticated sessions.
revoke execute on function public.create_order_with_stock_reservation(
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon;

revoke execute on function public.mark_manual_payment_paid(uuid) from public, anon;
revoke execute on function public.reserve_product_stock_for_order(uuid) from public, anon;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

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

grant execute on function public.mark_manual_payment_paid(uuid) to authenticated;
grant execute on function public.reserve_product_stock_for_order(uuid) to authenticated;

notify pgrst, 'reload schema';
