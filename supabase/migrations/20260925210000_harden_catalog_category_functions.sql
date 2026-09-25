-- The category writers only need administrator RLS policies, so they can run
-- with the caller's identity instead of elevated privileges.
drop policy if exists "Admins can manage catalog categories" on public.catalog_product_categories;
drop policy if exists "Admins can insert catalog categories" on public.catalog_product_categories;
create policy "Admins can insert catalog categories"
  on public.catalog_product_categories for insert to authenticated
  with check ((select public.is_admin()));
drop policy if exists "Admins can update catalog categories" on public.catalog_product_categories;
create policy "Admins can update catalog categories"
  on public.catalog_product_categories for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "Admins can delete catalog categories" on public.catalog_product_categories;
create policy "Admins can delete catalog categories"
  on public.catalog_product_categories for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can manage category items" on public.catalog_product_category_items;
drop policy if exists "Admins can insert category items" on public.catalog_product_category_items;
create policy "Admins can insert category items"
  on public.catalog_product_category_items for insert to authenticated
  with check ((select public.is_admin()));
drop policy if exists "Admins can update category items" on public.catalog_product_category_items;
create policy "Admins can update category items"
  on public.catalog_product_category_items for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "Admins can delete category items" on public.catalog_product_category_items;
create policy "Admins can delete category items"
  on public.catalog_product_category_items for delete to authenticated
  using ((select public.is_admin()));

alter function public.save_catalog_product_category(uuid, text, text, integer, boolean, uuid[])
  security invoker;
alter function public.delete_catalog_product_category(uuid)
  security invoker;

notify pgrst, 'reload schema';
