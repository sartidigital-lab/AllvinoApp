alter table public.orders
  add column if not exists payment_provider text not null default 'manual',
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_reference text,
  add column if not exists payment_url text,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_error text,
  add constraint orders_payment_status_check
    check (payment_status in ('pending', 'authorized', 'paid', 'failed', 'refunded', 'cancelled')) not valid;

update public.orders
  set payment_provider = 'manual'
  where payment_provider is null;

alter table public.orders
  validate constraint orders_payment_status_check;

create index if not exists orders_payment_status_created_at_idx
  on public.orders (payment_status, created_at desc);

create index if not exists orders_payment_reference_idx
  on public.orders (payment_reference)
  where payment_reference is not null;

notify pgrst, 'reload schema';
