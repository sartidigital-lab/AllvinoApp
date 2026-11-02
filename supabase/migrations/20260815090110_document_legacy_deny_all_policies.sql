-- These legacy tables are intentionally unavailable through PostgREST. Explicit
-- false policies preserve deny-all behavior while documenting that decision.
create policy "Legacy table deny all"
  on public.categorias for all
  to public
  using (false)
  with check (false);

create policy "Legacy table deny all"
  on public.equipe for all
  to public
  using (false)
  with check (false);

create policy "Legacy table deny all"
  on public.pedidos for all
  to public
  using (false)
  with check (false);

create policy "Legacy table deny all"
  on public.perfis for all
  to public
  using (false)
  with check (false);

create policy "Legacy table deny all"
  on public.promocoes for all
  to public
  using (false)
  with check (false);
