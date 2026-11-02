-- Remove legacy catch-all policies that bypass row-level security.
drop policy if exists "Acesso total produtos" on public.produtos;
drop policy if exists "Enable read access for all users" on public.produtos;

drop policy if exists "Acesso total Pedidos" on public.pedidos;
drop policy if exists "Acesso total Promocoes" on public.promocoes;
drop policy if exists "Acesso total Categorias" on public.categorias;
drop policy if exists "Acesso total Equipe" on public.equipe;
drop policy if exists "Acesso total perfis" on public.perfis;

notify pgrst, 'reload schema';
