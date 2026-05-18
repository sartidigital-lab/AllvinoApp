create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

grant execute on function public.is_admin() to authenticated;

grant insert, update, delete on public.wines to authenticated;
grant update on public.orders to authenticated;

drop policy if exists "Admins can manage wines" on public.wines;
create policy "Admins can manage wines"
  on public.wines
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can read all orders" on public.orders;
create policy "Admins can read all orders"
  on public.orders
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
  on public.orders
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can read all order items" on public.order_items;
create policy "Admins can read all order items"
  on public.order_items
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can manage product images" on storage.objects;
create policy "Admins can manage product images"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'produtos' and public.is_admin())
  with check (bucket_id = 'produtos' and public.is_admin());
