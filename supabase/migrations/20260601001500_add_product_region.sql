alter table public.produtos
  add column if not exists regiao text;

create index if not exists produtos_regiao_idx
  on public.produtos (regiao);

notify pgrst, 'reload schema';
