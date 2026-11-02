create table public.payment_provider_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'pagarme' check (provider = 'pagarme'),
  provider_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_provider_customers enable row level security;

create policy "Clients cannot access provider customer mappings"
  on public.payment_provider_customers
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on public.payment_provider_customers from anon, authenticated;

;


