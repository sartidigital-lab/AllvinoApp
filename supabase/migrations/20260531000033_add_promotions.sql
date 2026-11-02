create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  code text not null,
  title text not null,
  description text,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10, 2) not null check (discount_value > 0),
  min_subtotal numeric(10, 2) not null default 0 check (min_subtotal >= 0),
  max_discount numeric(10, 2) check (max_discount is null or max_discount > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  constraint promotions_code_uppercase check (code = upper(code)),
  constraint promotions_code_unique unique (code)
);

alter table public.orders
  add column if not exists promotion_code text;

create index if not exists promotions_code_idx
  on public.promotions (code);

create index if not exists promotions_active_window_idx
  on public.promotions (is_active, starts_at, ends_at);

grant select on public.promotions to anon, authenticated;
grant insert, update, delete on public.promotions to authenticated;

alter table public.promotions enable row level security;

drop policy if exists "Public can read active promotions" on public.promotions;
create policy "Public can read active promotions"
  on public.promotions
  for select
  to anon, authenticated
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists "Admins can manage promotions" on public.promotions;
create policy "Admins can manage promotions"
  on public.promotions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
