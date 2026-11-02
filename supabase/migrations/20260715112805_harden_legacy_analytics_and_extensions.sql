create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

-- wine_analytics is a legacy table and is not used by the current app.
-- Do not allow anonymous clients to write arbitrary rows to it.
drop policy if exists "wine_analytics_public_insert" on public.wine_analytics;

notify pgrst, 'reload schema';
