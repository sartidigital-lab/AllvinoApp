-- Older deployments may have this legacy trigger function; fresh installs do not.
do $$
begin
  if to_regprocedure('public.handle_new_admin_user()') is not null then
    execute 'revoke execute on function public.handle_new_admin_user() from public, anon, authenticated';
  end if;
end;
$$;

alter function public.is_admin()
  set search_path = public, pg_temp;

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'alter function public.set_updated_at() set search_path = public, pg_temp';
  end if;
end;
$$;

-- This compatibility view is only valid for the old Portuguese wine schema.
do $$
begin
  if (
    select count(*) = 12
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'wines'
      and column_name = any (array[
        'id', 'nome', 'produtor', 'pais', 'tipo', 'uva_varietal', 'safra',
        'preco_atacado', 'imagem_url', 'destaque', 'ativo', 'ordem'
      ])
  ) then
    execute $view$
      create or replace view public.wines_active_summary
        with (security_invoker = true)
      as
        select id, nome, produtor, pais, tipo, uva_varietal, safra,
               preco_atacado, imagem_url, destaque
        from public.wines
        where ativo = true
        order by destaque desc, ordem, nome
    $view$;
  end if;
end;
$$;

notify pgrst, 'reload schema';
