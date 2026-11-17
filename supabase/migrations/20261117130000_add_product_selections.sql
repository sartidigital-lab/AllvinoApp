create table public.product_selections (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 2 and 120),
  description text not null default '',
  image_url text not null check (char_length(trim(image_url)) > 0),
  product_ids uuid[] not null default '{}',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_selections enable row level security;
grant select on public.product_selections to anon, authenticated;
grant insert, update, delete on public.product_selections to authenticated;
create policy "Public can read active selections" on public.product_selections
  for select to anon, authenticated using (is_active);
create policy "Admins manage selections" on public.product_selections
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
