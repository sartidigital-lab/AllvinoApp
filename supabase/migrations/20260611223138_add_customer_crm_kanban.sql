create table if not exists public.customer_crm_cards (
  id uuid primary key default gen_random_uuid(),
  customer_key text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  stage text not null default 'novo'
    check (stage in ('novo', 'contato', 'negociacao', 'pedido', 'pos_venda')),
  priority text not null default 'normal'
    check (priority in ('baixa', 'normal', 'alta')),
  notes text,
  next_action_at timestamptz,
  last_contacted_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists customer_crm_cards_stage_updated_at_idx
  on public.customer_crm_cards (stage, updated_at desc);

create index if not exists customer_crm_cards_next_action_idx
  on public.customer_crm_cards (next_action_at)
  where next_action_at is not null;

grant select, insert, update, delete on public.customer_crm_cards to authenticated;

alter table public.customer_crm_cards enable row level security;

drop policy if exists "Admins can manage customer crm cards" on public.customer_crm_cards;
create policy "Admins can manage customer crm cards"
  on public.customer_crm_cards
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
