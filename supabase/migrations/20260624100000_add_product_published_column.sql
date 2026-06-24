-- Add publicado (published) column to produtos table.
-- Defaults to true so existing products remain visible in the catalog.
alter table public.produtos
  add column if not exists publicado boolean not null default true;

-- RLS: public users should only see published products
drop policy if exists "Public can read published products" on public.produtos;
create policy "Public can read published products"
  on public.produtos
  for select
  to anon
  using (publicado = true);

-- Also update the wines table if it still has data
alter table public.wines
  add column if not exists publicado boolean not null default true;

-- Drop old policy that allows anon+authenticated to read all wines
drop policy if exists "Public can read wines" on public.wines;

-- Public (anon) can only see published wines
drop policy if exists "Public can read published wines" on public.wines;
create policy "Public can read published wines"
  on public.wines
  for select
  to anon
  using (publicado = true);

-- Authenticated users (admins) can read all wines including unpublished
drop policy if exists "Authenticated can read all wines" on public.wines;
create policy "Authenticated can read all wines"
  on public.wines
  for select
  to authenticated
  using (true);

notify pgrst, 'reload schema';
