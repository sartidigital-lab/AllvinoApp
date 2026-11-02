revoke execute on function public.handle_new_admin_user() from public, anon, authenticated;

alter function public.is_admin()
  set search_path = public, pg_temp;

alter function public.set_updated_at()
  set search_path = public, pg_temp;

create or replace view public.wines_active_summary
  with (security_invoker = true)
as
  select
    id,
    nome,
    produtor,
    pais,
    tipo,
    uva_varietal,
    safra,
    preco_atacado,
    imagem_url,
    destaque
  from public.wines
  where ativo = true
  order by destaque desc, ordem, nome;

notify pgrst, 'reload schema';
