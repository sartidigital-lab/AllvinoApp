-- The App Router now uses public.produtos as the canonical catalog source.
-- Keep legacy tables available only to the database owner for rollback and
-- historical inspection; they must not remain exposed through the Data API.
revoke all on public.wines from anon, authenticated;

-- Older installations can still contain these tables. New installations do
-- not create them, so apply the same exposure reduction only when present.
do $$
declare
  legacy_table text;
begin
  foreach legacy_table in array array['categorias', 'equipe', 'pedidos', 'perfis', 'promocoes'] loop
    if to_regclass(format('public.%I', legacy_table)) is not null then
      execute format('revoke all on table public.%I from anon, authenticated', legacy_table);
    end if;
  end loop;
end;
$$;

drop policy if exists "Public can read active published wines" on public.wines;
drop policy if exists "Public can read published wines" on public.wines;

create policy "Legacy catalog deny all"
  on public.wines
  for all
  to anon, authenticated
  using (false)
  with check (false);

notify pgrst, 'reload schema';
