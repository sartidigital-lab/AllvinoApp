-- Keep RLS semantics while avoiding per-row auth.uid() evaluation.
drop policy if exists "Admins can read all orders" on public.orders;
create policy "Admins can read all orders"
  on public.orders for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
  on public.orders for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
  on public.orders for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Admins can read all order items" on public.order_items;
create policy "Admins can read all order items"
  on public.order_items for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Users can read items from own orders" on public.order_items;
create policy "Users can read items from own orders"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1
      from public.orders
      where public.orders.id = order_items.order_id
        and public.orders.user_id = (select auth.uid())
    )
  );

drop policy if exists "wine_analytics_admin_read" on public.wine_analytics;
create policy "wine_analytics_admin_read"
  on public.wine_analytics for select to authenticated
  using (
    exists (
      select 1
      from public.admin_users au
      where au.id = (select auth.uid())
        and au.ativo = true
    )
  );

drop policy if exists "wine_analytics_admin_delete" on public.wine_analytics;
create policy "wine_analytics_admin_delete"
  on public.wine_analytics for delete to authenticated
  using (
    exists (
      select 1
      from public.admin_users au
      where au.id = (select auth.uid())
        and au.ativo = true
    )
  );

drop policy if exists "catalog_history_admin_insert" on public.catalog_history;
create policy "catalog_history_admin_insert"
  on public.catalog_history for insert to authenticated
  with check (
    exists (
      select 1
      from public.admin_users au
      where au.id = (select auth.uid())
        and au.ativo = true
    )
  );

drop policy if exists "catalog_history_admin_read" on public.catalog_history;
create policy "catalog_history_admin_read"
  on public.catalog_history for select to authenticated
  using (
    exists (
      select 1
      from public.admin_users au
      where au.id = (select auth.uid())
        and au.ativo = true
    )
  );

-- The legacy catalog is no longer used by the application and has no client grants.
drop policy if exists "wines_admin_all" on public.wines;

notify pgrst, 'reload schema';
