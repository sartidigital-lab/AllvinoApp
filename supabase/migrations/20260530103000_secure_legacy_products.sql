create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  sku_sankhya text,
  preco numeric(10, 2) not null check (preco >= 0),
  pais text,
  tipo text,
  uva text,
  imagem_url text,
  criado_em timestamptz not null default timezone('utc'::text, now())
);

grant usage on schema public to anon, authenticated;
grant select on public.produtos to anon, authenticated;
grant insert, update, delete on public.produtos to authenticated;

alter table public.produtos enable row level security;

drop policy if exists "Public can read products" on public.produtos;
create policy "Public can read products"
  on public.produtos
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can manage products" on public.produtos;
create policy "Admins can manage products"
  on public.produtos
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists produtos_criado_em_idx
  on public.produtos (criado_em desc);

create index if not exists produtos_tipo_idx
  on public.produtos (tipo);

create index if not exists produtos_pais_idx
  on public.produtos (pais);

create index if not exists produtos_preco_idx
  on public.produtos (preco);

drop policy if exists "Authenticated users can upload product images" on storage.objects;
