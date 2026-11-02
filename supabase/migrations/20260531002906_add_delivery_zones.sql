create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  name text not null,
  zip_start text not null check (zip_start ~ '^[0-9]{8}$'),
  zip_end text not null check (zip_end ~ '^[0-9]{8}$'),
  fee numeric(10, 2) not null default 0 check (fee >= 0),
  free_shipping_min_subtotal numeric(10, 2) check (free_shipping_min_subtotal is null or free_shipping_min_subtotal >= 0),
  estimate_days integer not null default 1 check (estimate_days > 0),
  is_active boolean not null default true,
  constraint delivery_zones_zip_range check (zip_start <= zip_end)
);

alter table public.orders
  add column if not exists delivery_zip_code text,
  add column if not exists delivery_zone_name text,
  add column if not exists delivery_estimate_days integer,
  add column if not exists shipping_fee numeric(10, 2) not null default 0;

create index if not exists delivery_zones_zip_range_idx
  on public.delivery_zones (zip_start, zip_end);

create index if not exists delivery_zones_active_idx
  on public.delivery_zones (is_active);

grant select on public.delivery_zones to anon, authenticated;
grant insert, update, delete on public.delivery_zones to authenticated;

alter table public.delivery_zones enable row level security;

drop policy if exists "Public can read active delivery zones" on public.delivery_zones;
create policy "Public can read active delivery zones"
  on public.delivery_zones
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins can manage delivery zones" on public.delivery_zones;
create policy "Admins can manage delivery zones"
  on public.delivery_zones
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
