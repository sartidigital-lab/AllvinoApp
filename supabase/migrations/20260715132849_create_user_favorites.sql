create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, product_id)
);

create index if not exists user_favorites_product_id_idx
  on public.user_favorites (product_id);

grant select, insert, delete on public.user_favorites to authenticated;

alter table public.user_favorites enable row level security;

drop policy if exists "Users can read their favorites" on public.user_favorites;
create policy "Users can read their favorites"
  on public.user_favorites
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their favorites" on public.user_favorites;
create policy "Users can add their favorites"
  on public.user_favorites
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove their favorites" on public.user_favorites;
create policy "Users can remove their favorites"
  on public.user_favorites
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
