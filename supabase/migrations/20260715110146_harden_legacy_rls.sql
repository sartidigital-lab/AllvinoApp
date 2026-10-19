-- Remove legacy catch-all policies that bypass row-level security.
drop policy if exists "Acesso total produtos" on public.produtos;
drop policy if exists "Enable read access for all users" on public.produtos;

-- These tables exist only in older deployments; a fresh install uses the
-- canonical English-named tables created by the repository migrations.
do $$
begin
  if to_regclass('public.pedidos') is not null then
    execute 'drop policy if exists "Acesso total Pedidos" on public.pedidos';
  end if;
  if to_regclass('public.promocoes') is not null then
    execute 'drop policy if exists "Acesso total Promocoes" on public.promocoes';
  end if;
  if to_regclass('public.categorias') is not null then
    execute 'drop policy if exists "Acesso total Categorias" on public.categorias';
  end if;
  if to_regclass('public.equipe') is not null then
    execute 'drop policy if exists "Acesso total Equipe" on public.equipe';
  end if;
  if to_regclass('public.perfis') is not null then
    execute 'drop policy if exists "Acesso total perfis" on public.perfis';
  end if;
end;
$$;

notify pgrst, 'reload schema';
