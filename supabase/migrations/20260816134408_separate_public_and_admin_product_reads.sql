drop policy if exists "Public can read published products" on public.produtos;
drop policy if exists "Admins can read all products" on public.produtos;

create policy "Public can read published products"
  on public.produtos
  for select
  to anon, authenticated
  using (publicado = true);

create policy "Admins can read all products"
  on public.produtos
  for select
  to authenticated
  using ((select public.is_admin()));

notify pgrst, 'reload schema';
