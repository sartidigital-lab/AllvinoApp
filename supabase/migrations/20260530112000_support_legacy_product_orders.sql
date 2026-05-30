alter table public.order_items
  add column if not exists product_id uuid,
  add column if not exists product_name text;

create index if not exists order_items_product_id_idx
  on public.order_items (product_id);
