create index catalog_banners_promotion_id_idx
  on public.catalog_banners (promotion_id);

alter function public.save_product_promotion_campaign(
  uuid, text, text, text, integer, timestamptz, timestamptz, boolean, uuid[]
) security invoker;

drop policy "Public can read current product promotions" on public.product_promotions;
drop policy "Admins can manage product promotions" on public.product_promotions;

create policy "Anonymous users can read current product promotions"
  on public.product_promotions for select
  to anon
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create policy "Authenticated users can read allowed product promotions"
  on public.product_promotions for select
  to authenticated
  using (
    (
      is_active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    )
    or (select public.is_admin())
  );

create policy "Admins can insert product promotions"
  on public.product_promotions for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update product promotions"
  on public.product_promotions for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete product promotions"
  on public.product_promotions for delete
  to authenticated
  using ((select public.is_admin()));

drop policy "Public can read current product promotion items" on public.product_promotion_items;
drop policy "Admins can manage product promotion items" on public.product_promotion_items;

create policy "Anonymous users can read current product promotion items"
  on public.product_promotion_items for select
  to anon
  using (
    exists (
      select 1
      from public.product_promotions
      where product_promotions.id = product_promotion_items.promotion_id
        and product_promotions.is_active = true
        and (product_promotions.starts_at is null or product_promotions.starts_at <= now())
        and (product_promotions.ends_at is null or product_promotions.ends_at >= now())
    )
    and exists (
      select 1
      from public.produtos
      where produtos.id = product_promotion_items.product_id
        and produtos.publicado = true
    )
  );

create policy "Authenticated users can read allowed product promotion items"
  on public.product_promotion_items for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      exists (
        select 1
        from public.product_promotions
        where product_promotions.id = product_promotion_items.promotion_id
          and product_promotions.is_active = true
          and (product_promotions.starts_at is null or product_promotions.starts_at <= now())
          and (product_promotions.ends_at is null or product_promotions.ends_at >= now())
      )
      and exists (
        select 1
        from public.produtos
        where produtos.id = product_promotion_items.product_id
          and produtos.publicado = true
      )
    )
  );

create policy "Admins can insert product promotion items"
  on public.product_promotion_items for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update product promotion items"
  on public.product_promotion_items for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete product promotion items"
  on public.product_promotion_items for delete
  to authenticated
  using ((select public.is_admin()));

drop policy "Public can read current catalog banners" on public.catalog_banners;
drop policy "Admins can manage catalog banners" on public.catalog_banners;

create policy "Anonymous users can read current catalog banners"
  on public.catalog_banners for select
  to anon
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
    and exists (
      select 1
      from public.product_promotions
      where product_promotions.id = catalog_banners.promotion_id
        and product_promotions.is_active = true
        and (product_promotions.starts_at is null or product_promotions.starts_at <= now())
        and (product_promotions.ends_at is null or product_promotions.ends_at >= now())
    )
  );

create policy "Authenticated users can read allowed catalog banners"
  on public.catalog_banners for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      is_active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
      and exists (
        select 1
        from public.product_promotions
        where product_promotions.id = catalog_banners.promotion_id
          and product_promotions.is_active = true
          and (product_promotions.starts_at is null or product_promotions.starts_at <= now())
          and (product_promotions.ends_at is null or product_promotions.ends_at >= now())
      )
    )
  );

create policy "Admins can insert catalog banners"
  on public.catalog_banners for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update catalog banners"
  on public.catalog_banners for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete catalog banners"
  on public.catalog_banners for delete
  to authenticated
  using ((select public.is_admin()));

notify pgrst, 'reload schema';
