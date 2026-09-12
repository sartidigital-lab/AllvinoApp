-- Keep public reads for anon while giving authenticated users one SELECT policy.

drop policy if exists "Admins can manage delivery zones" on public.delivery_zones;
drop policy if exists "Public can read active delivery zones" on public.delivery_zones;

create policy "Public can read active delivery zones"
  on public.delivery_zones for select to anon
  using (is_active = true);

create policy "Authenticated can read delivery zones"
  on public.delivery_zones for select to authenticated
  using (is_active = true or (select public.is_admin()));

create policy "Admins can insert delivery zones"
  on public.delivery_zones for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update delivery zones"
  on public.delivery_zones for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete delivery zones"
  on public.delivery_zones for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can read all order items" on public.order_items;
drop policy if exists "Users can read items from own orders" on public.order_items;
create policy "Users and admins can read order items"
  on public.order_items for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.orders
      where public.orders.id = order_items.order_id
        and public.orders.user_id = (select auth.uid())
    )
  );

drop policy if exists "Admins can read all orders" on public.orders;
drop policy if exists "Users can read own orders" on public.orders;
create policy "Users and admins can read orders"
  on public.orders for select to authenticated
  using ((select public.is_admin()) or (select auth.uid()) = user_id);

drop policy if exists "Admins can read all products" on public.produtos;
drop policy if exists "Public can read published products" on public.produtos;
create policy "Public can read published products"
  on public.produtos for select to anon
  using (publicado = true);

create policy "Authenticated can read published products"
  on public.produtos for select to authenticated
  using (publicado = true or (select public.is_admin()));

drop policy if exists "Admins can manage promotions" on public.promotions;
drop policy if exists "Public can read active promotions" on public.promotions;

create policy "Public can read active promotions"
  on public.promotions for select to anon
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create policy "Authenticated can read active promotions"
  on public.promotions for select to authenticated
  using (
    (select public.is_admin())
    or (
      is_active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    )
  );

create policy "Admins can insert promotions"
  on public.promotions for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update promotions"
  on public.promotions for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete promotions"
  on public.promotions for delete to authenticated
  using ((select public.is_admin()));

notify pgrst, 'reload schema';
