-- The App Router now uses public.produtos as the canonical catalog source.
-- Keep legacy tables available only to the database owner for rollback and
-- historical inspection; they must not remain exposed through the Data API.
revoke all on public.wines from anon, authenticated;
revoke all on public.categorias from anon, authenticated;
revoke all on public.equipe from anon, authenticated;
revoke all on public.pedidos from anon, authenticated;
revoke all on public.perfis from anon, authenticated;
revoke all on public.promocoes from anon, authenticated;

drop policy if exists "Public can read active published wines" on public.wines;
drop policy if exists "Public can read published wines" on public.wines;

create policy "Legacy catalog deny all"
  on public.wines
  for all
  to anon, authenticated
  using (false)
  with check (false);

notify pgrst, 'reload schema';
