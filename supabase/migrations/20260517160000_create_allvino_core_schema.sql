create extension if not exists pgcrypto with schema extensions;

create table if not exists public.wines (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  type text,
  region text,
  grape text,
  stock integer not null default 0 check (stock >= 0),
  category text
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending',
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  delivery_type text not null default 'delivery'
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  wine_id uuid references public.wines(id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0)
);

create index if not exists orders_user_id_created_at_idx
  on public.orders (user_id, created_at desc);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

create index if not exists order_items_wine_id_idx
  on public.order_items (wine_id);

grant usage on schema public to anon, authenticated;
grant select on public.wines to anon, authenticated;
grant select, insert on public.orders to authenticated;
grant select, insert on public.order_items to authenticated;

insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

alter table public.wines enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Public can read wines" on public.wines;
create policy "Public can read wines"
  on public.wines
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can create own orders" on public.orders;
create policy "Users can create own orders"
  on public.orders
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
  on public.orders
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create items for own orders" on public.order_items;
create policy "Users can create items for own orders"
  on public.order_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

drop policy if exists "Users can read items from own orders" on public.order_items;
create policy "Users can read items from own orders"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

drop policy if exists "Public can read product images" on storage.objects;
create policy "Public can read product images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'produtos');

drop policy if exists "Authenticated users can upload product images" on storage.objects;
create policy "Authenticated users can upload product images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'produtos');
