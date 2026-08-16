create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nome text,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  ativo boolean not null default true,
  criado_em timestamptz not null default timezone('utc'::text, now())
);

alter table public.admin_users enable row level security;

-- Preserve explicitly configured Auth administrators while bringing the live
-- allowlist under migrations. Existing allowlist roles and active flags win.
insert into public.admin_users (id, email, nome, role, ativo)
select
  users.id,
  users.email,
  coalesce(
    nullif(users.raw_user_meta_data ->> 'nome_completo', ''),
    nullif(users.raw_user_meta_data ->> 'name', ''),
    split_part(users.email, '@', 1)
  ),
  'owner',
  true
from auth.users as users
where users.email is not null
  and users.raw_app_meta_data ->> 'role' = 'admin'
on conflict (id) do update
set email = excluded.email,
    nome = coalesce(public.admin_users.nome, excluded.nome);

create or replace function public.handle_new_admin_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- app_metadata is server-managed. Public signups must never enter the
  -- administrative allowlist.
  if coalesce(new.raw_app_meta_data ->> 'role', '') = 'admin' and new.email is not null then
    insert into public.admin_users (id, email, nome, role, ativo)
    values (
      new.id,
      new.email,
      coalesce(
        nullif(new.raw_user_meta_data ->> 'nome_completo', ''),
        nullif(new.raw_user_meta_data ->> 'name', ''),
        split_part(new.email, '@', 1)
      ),
      'editor',
      true
    )
    on conflict (id) do update
    set email = excluded.email,
        nome = coalesce(public.admin_users.nome, excluded.nome);
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_admin_user() from public, anon, authenticated;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_admin_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users as admins
    join auth.users as users on users.id = admins.id
    where admins.id = (select auth.uid())
      and admins.ativo = true
      and admins.role in ('owner', 'editor')
      and users.raw_app_meta_data ->> 'role' = 'admin'
      and (users.banned_until is null or users.banned_until <= now())
  )
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "admin_users_owner_all" on public.admin_users;
drop policy if exists "admin_users_self_read" on public.admin_users;

create policy "admin_users_self_read"
  on public.admin_users
  for select
  to authenticated
  using (id = (select auth.uid()));

revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;

-- The live wines policy drifted to a recursive admin_users lookup. Keep one
-- authorization path for every administrative table and storage policy.
drop policy if exists "Admins can manage wines" on public.wines;
drop policy if exists "wines_admin_all" on public.wines;

create policy "wines_admin_all"
  on public.wines
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- RLS does not protect TRUNCATE. Anonymous clients also have no legitimate
-- direct write path; checkout and account writes are authenticated or RPC-only.
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public
  from anon;

revoke truncate, references, trigger
  on all tables in schema public
  from authenticated;

alter default privileges in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon;

alter default privileges in schema public
  revoke truncate, references, trigger on tables from authenticated;

notify pgrst, 'reload schema';
