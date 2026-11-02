alter table public.orders
  add column if not exists payment_method text,
  add column if not exists delivery_address text,
  add column if not exists discount_amount numeric(10, 2) not null default 0,
  add column if not exists subtotal_amount numeric(10, 2);
