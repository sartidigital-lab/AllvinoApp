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

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'wines' and column_name = 'ativo'
  ) then
    execute $policy$
      create policy "Public can read active published wines"
        on public.wines for select to anon, authenticated
        using (ativo = true and publicado = true)
    $policy$;
  else
    execute $policy$
      create policy "Public can read active published wines"
        on public.wines for select to anon, authenticated
        using (publicado = true)
    $policy$;
  end if;
end;
$$;

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
do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'revoke execute on function public.set_updated_at() from public, anon, authenticated';
  end if;
end;
$$;

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
