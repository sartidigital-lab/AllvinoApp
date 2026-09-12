-- Keep the authorization result available to RLS while removing the
-- SECURITY DEFINER implementation from the PostgREST-exposed public schema.
create schema if not exists app_private;

create or replace function app_private.is_admin()
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

revoke all on function app_private.is_admin() from public, anon;
grant execute on function app_private.is_admin() to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app_private.is_admin()
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

notify pgrst, 'reload schema';
