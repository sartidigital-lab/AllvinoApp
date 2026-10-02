-- Product reviews are only created through the controlled RPC below. This
-- keeps the "verified purchase" rule enforceable even when a client bypasses
-- the product page.
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.produtos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists product_reviews_product_created_at_idx
  on public.product_reviews (product_id, created_at desc);

alter table public.product_reviews enable row level security;

-- Review rows never need to be queried directly by a browser. Public reads
-- use the two sanitized views below and writes use submit_product_review.
revoke all on table public.product_reviews from anon, authenticated;

create or replace function app_private.current_user_has_paid_for_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders as orders
    join public.order_items as items on items.order_id = orders.id
    where orders.user_id = (select auth.uid())
      and orders.payment_status = 'paid'
      and orders.status <> 'cancelled'
      and coalesce(items.product_id, items.wine_id) = p_product_id
  );
$$;

revoke all on function app_private.current_user_has_paid_for_product(uuid)
  from public, anon, authenticated;

create or replace function app_private.get_product_review_state(p_product_id uuid)
returns table (
  can_review boolean,
  rating smallint,
  comment text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.current_user_has_paid_for_product(p_product_id) as can_review,
    reviews.rating,
    reviews.comment
  from (select auth.uid() as user_id) as viewer
  left join public.product_reviews as reviews
    on reviews.product_id = p_product_id
   and reviews.user_id = viewer.user_id;
$$;

revoke all on function app_private.get_product_review_state(uuid)
  from public, anon, authenticated;
grant execute on function app_private.get_product_review_state(uuid) to authenticated;

create or replace function app_private.submit_product_review(
  p_product_id uuid,
  p_rating smallint,
  p_comment text default null
)
returns table (
  id uuid,
  rating smallint,
  comment text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if v_user_id is null then
    raise exception 'Nao autenticado.';
  end if;

  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'A nota precisa estar entre 1 e 5.';
  end if;

  if v_comment is not null and char_length(v_comment) > 500 then
    raise exception 'O comentario pode ter no maximo 500 caracteres.';
  end if;

  if not exists (select 1 from public.produtos where produtos.id = p_product_id) then
    raise exception 'Produto nao encontrado.';
  end if;

  if not app_private.current_user_has_paid_for_product(p_product_id) then
    raise exception 'A avaliacao e exclusiva para clientes que compraram este produto.';
  end if;

  return query
  insert into public.product_reviews (product_id, user_id, rating, comment)
  values (p_product_id, v_user_id, p_rating, v_comment)
  on conflict (product_id, user_id) do update
    set rating = excluded.rating,
        comment = excluded.comment,
        updated_at = now()
  returning product_reviews.id,
            product_reviews.rating,
            product_reviews.comment,
            product_reviews.created_at,
            product_reviews.updated_at;
end;
$$;

revoke all on function app_private.submit_product_review(uuid, smallint, text)
  from public, anon, authenticated;
grant execute on function app_private.submit_product_review(uuid, smallint, text) to authenticated;

create or replace function app_private.get_product_review_feed(p_product_id uuid)
returns table (
  id uuid,
  rating smallint,
  comment text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select reviews.id, reviews.rating, reviews.comment, reviews.created_at, reviews.updated_at
  from public.product_reviews as reviews
  where reviews.product_id = p_product_id
  order by reviews.created_at desc;
$$;

revoke all on function app_private.get_product_review_feed(uuid)
  from public, anon, authenticated;
grant execute on function app_private.get_product_review_feed(uuid) to anon, authenticated;

create or replace function app_private.get_product_review_summary(p_product_id uuid)
returns table (
  review_count integer,
  average_rating numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*)::integer as review_count,
    round(avg(rating)::numeric, 1) as average_rating
  from public.product_reviews as reviews
  where reviews.product_id = p_product_id;
$$;

revoke all on function app_private.get_product_review_summary(uuid)
  from public, anon, authenticated;
grant execute on function app_private.get_product_review_summary(uuid) to anon, authenticated;

-- Public wrappers are intentionally SECURITY INVOKER. The privileged work
-- remains in app_private, which is not exposed through the Data API.
create or replace function public.get_product_review_state(p_product_id uuid)
returns table (can_review boolean, rating smallint, comment text)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from app_private.get_product_review_state(p_product_id);
$$;

create or replace function public.submit_product_review(
  p_product_id uuid,
  p_rating smallint,
  p_comment text default null
)
returns table (id uuid, rating smallint, comment text, created_at timestamptz, updated_at timestamptz)
language sql
security invoker
set search_path = ''
as $$
  select * from app_private.submit_product_review(p_product_id, p_rating, p_comment);
$$;

create or replace function public.get_product_review_feed(p_product_id uuid)
returns table (id uuid, rating smallint, comment text, created_at timestamptz, updated_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from app_private.get_product_review_feed(p_product_id);
$$;

create or replace function public.get_product_review_summary(p_product_id uuid)
returns table (review_count integer, average_rating numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from app_private.get_product_review_summary(p_product_id);
$$;

revoke all on function public.get_product_review_state(uuid) from public, anon, authenticated;
revoke all on function public.submit_product_review(uuid, smallint, text) from public, anon, authenticated;
revoke all on function public.get_product_review_feed(uuid) from public, anon, authenticated;
revoke all on function public.get_product_review_summary(uuid) from public, anon, authenticated;
grant execute on function public.get_product_review_state(uuid), public.submit_product_review(uuid, smallint, text) to authenticated;
grant execute on function public.get_product_review_feed(uuid), public.get_product_review_summary(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
