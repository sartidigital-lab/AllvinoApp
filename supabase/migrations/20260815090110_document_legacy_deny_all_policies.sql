-- Preserve deny-all behavior where these optional legacy tables still exist.
do $$
declare
  legacy_table text;
begin
  foreach legacy_table in array array['categorias', 'equipe', 'pedidos', 'perfis', 'promocoes'] loop
    if to_regclass(format('public.%I', legacy_table)) is not null then
      execute format('drop policy if exists %I on public.%I', 'Legacy table deny all', legacy_table);
      execute format(
        'create policy %I on public.%I for all to public using (false) with check (false)',
        'Legacy table deny all', legacy_table
      );
    end if;
  end loop;
end;
$$;
