-- Curated storefront sections. "Todos os produtos" remains a computed catalog
-- section and is intentionally not stored here.
create table if not exists public.catalog_product_categories (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sort_order integer not null default 0 check (sort_order between 0 and 9999),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.catalog_product_category_items (
  category_id uuid not null references public.catalog_product_categories(id) on delete cascade,
  product_id uuid not null references public.produtos(id) on delete cascade,
  sort_order integer not null default 0 check (sort_order between 0 and 9999),
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (category_id, product_id)
);

create index if not exists catalog_product_categories_active_sort_idx
  on public.catalog_product_categories (is_active, sort_order, title);
create index if not exists catalog_product_category_items_category_sort_idx
  on public.catalog_product_category_items (category_id, sort_order, created_at);

alter table public.catalog_product_categories enable row level security;
alter table public.catalog_product_category_items enable row level security;

grant select on public.catalog_product_categories, public.catalog_product_category_items to anon, authenticated;

drop policy if exists "Visitors can read active catalog categories" on public.catalog_product_categories;
create policy "Visitors can read active catalog categories"
  on public.catalog_product_categories for select to anon
  using (is_active = true);

drop policy if exists "Admins can read catalog categories" on public.catalog_product_categories;
create policy "Admins can read catalog categories"
  on public.catalog_product_categories for select to authenticated
  using (is_active = true or (select public.is_admin()));

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

drop policy if exists "Visitors can read active category items" on public.catalog_product_category_items;
create policy "Visitors can read active category items"
  on public.catalog_product_category_items for select to anon
  using (
    exists (
      select 1 from public.catalog_product_categories category
      where category.id = category_id and category.is_active = true
    )
  );

drop policy if exists "Admins can read category items" on public.catalog_product_category_items;
create policy "Admins can read category items"
  on public.catalog_product_category_items for select to authenticated
  using (
    (select public.is_admin()) or exists (
      select 1 from public.catalog_product_categories category
      where category.id = category_id and category.is_active = true
    )
  );

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

create or replace function public.save_catalog_product_category(
  p_id uuid,
  p_title text,
  p_slug text,
  p_sort_order integer,
  p_is_active boolean,
  p_product_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_title text := btrim(coalesce(p_title, ''));
  v_slug text := lower(btrim(coalesce(p_slug, '')));
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem gerenciar categorias do catálogo.';
  end if;
  if char_length(v_title) not between 2 and 80 then
    raise exception 'Informe um nome de categoria entre 2 e 80 caracteres.';
  end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Informe um identificador válido para a categoria.';
  end if;
  if coalesce(p_sort_order, 0) not between 0 and 9999 then
    raise exception 'Informe uma ordem entre 0 e 9999.';
  end if;

  insert into public.catalog_product_categories (id, title, slug, sort_order, is_active, updated_at)
  values (v_id, v_title, v_slug, coalesce(p_sort_order, 0), coalesce(p_is_active, true), now())
  on conflict (id) do update set
    title = excluded.title,
    slug = excluded.slug,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    updated_at = now();

  delete from public.catalog_product_category_items where category_id = v_id;
  insert into public.catalog_product_category_items (category_id, product_id, sort_order)
  select v_id, selected.product_id, selected.ordinality - 1
  from unnest(coalesce(p_product_ids, array[]::uuid[])) with ordinality as selected(product_id, ordinality)
  join public.produtos product on product.id = selected.product_id
  on conflict (category_id, product_id) do update set sort_order = excluded.sort_order;

  return v_id;
end;
$$;

revoke all on function public.save_catalog_product_category(uuid, text, text, integer, boolean, uuid[]) from public, anon, authenticated;
grant execute on function public.save_catalog_product_category(uuid, text, text, integer, boolean, uuid[]) to authenticated;

create or replace function public.delete_catalog_product_category(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem excluir categorias do catálogo.';
  end if;
  delete from public.catalog_product_categories where id = p_id;
end;
$$;

revoke all on function public.delete_catalog_product_category(uuid) from public, anon, authenticated;
grant execute on function public.delete_catalog_product_category(uuid) to authenticated;

insert into public.catalog_product_categories (title, slug, sort_order, is_active)
values
  ('Mais vendidos', 'mais-vendidos', 10, true),
  ('Kits promocionais', 'kits-promocionais', 20, true),
  ('Para presentear', 'para-presentear', 30, true),
  ('Seleção Allvino', 'selecao-allvino', 40, true)
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
