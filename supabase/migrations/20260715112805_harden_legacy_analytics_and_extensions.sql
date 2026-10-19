create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
alter extension pg_trgm set schema extensions;

-- wine_analytics is a legacy table and is not used by the current app.
-- Do not allow anonymous clients to write arbitrary rows to it.
do $$
begin
  if to_regclass('public.wine_analytics') is not null then
    execute 'drop policy if exists "wine_analytics_public_insert" on public.wine_analytics';
  end if;
end;
$$;

notify pgrst, 'reload schema';
