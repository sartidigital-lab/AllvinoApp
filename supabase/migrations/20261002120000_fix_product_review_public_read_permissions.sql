-- Public review readers call a SECURITY INVOKER wrapper, which resolves a
-- narrowly scoped SECURITY DEFINER function in app_private.
grant usage on schema app_private to anon, authenticated;

notify pgrst, 'reload schema';
