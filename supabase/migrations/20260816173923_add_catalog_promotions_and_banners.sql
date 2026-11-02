-- Version aligned with the migration recorded by the Supabase API.
create table public.product_promotions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  title text not null check (length(trim(title)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  discount_percent integer not null check (discount_percent between 1 and 90),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  constraint product_promotions_valid_window check (
    starts_at is null or ends_at is null or ends_at > starts_at
  )
);

create table public.product_promotion_items (
  promotion_id uuid not null references public.product_promotions(id) on delete cascade,
  product_id uuid not null references public.produtos(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (promotion_id, product_id)
);

create table public.catalog_banners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  promotion_id uuid not null references public.product_promotions(id) on delete cascade,
  eyebrow text,
  title text not null check (length(trim(title)) between 2 and 120),
  subtitle text,
  cta_label text not null default 'Ver selecao' check (length(trim(cta_label)) between 2 and 40),
  image_url text,
  mobile_image_url text,
  image_alt text,
  theme text not null default 'wine' check (theme in ('wine', 'gold', 'forest')),
  sort_order integer not null default 0 check (sort_order between 0 and 999),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  constraint catalog_banners_valid_window check (
    starts_at is null or ends_at is null or ends_at > starts_at
  )
);

create index product_promotions_active_window_idx
  on public.product_promotions (is_active, starts_at, ends_at, discount_percent desc);
create index product_promotion_items_product_idx
  on public.product_promotion_items (product_id, promotion_id);
create index catalog_banners_active_order_idx
  on public.catalog_banners (is_active, starts_at, ends_at, sort_order, created_at);

alter table public.product_promotions enable row level security;
alter table public.product_promotion_items enable row level security;
alter table public.catalog_banners enable row level security;

revoke all on public.product_promotions from public, anon, authenticated;
revoke all on public.product_promotion_items from public, anon, authenticated;
revoke all on public.catalog_banners from public, anon, authenticated;

grant select on public.product_promotions to anon, authenticated;
grant select on public.product_promotion_items to anon, authenticated;
grant select on public.catalog_banners to anon, authenticated;
grant insert, update, delete on public.product_promotions to authenticated;
grant insert, update, delete on public.product_promotion_items to authenticated;
grant insert, update, delete on public.catalog_banners to authenticated;

create policy "Public can read current product promotions"
  on public.product_promotions for select
  to anon, authenticated
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

create policy "Admins can manage product promotions"
  on public.product_promotions for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Public can read current product promotion items"
  on public.product_promotion_items for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.product_promotions
      where product_promotions.id = product_promotion_items.promotion_id
        and product_promotions.is_active = true
        and (product_promotions.starts_at is null or product_promotions.starts_at <= now())
        and (product_promotions.ends_at is null or product_promotions.ends_at >= now())
    )
    and exists (
      select 1
      from public.produtos
      where produtos.id = product_promotion_items.product_id
        and produtos.publicado = true
    )
  );

create policy "Admins can manage product promotion items"
  on public.product_promotion_items for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Public can read current catalog banners"
  on public.catalog_banners for select
  to anon, authenticated
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
    and exists (
      select 1
      from public.product_promotions
      where product_promotions.id = catalog_banners.promotion_id
        and product_promotions.is_active = true
        and (product_promotions.starts_at is null or product_promotions.starts_at <= now())
        and (product_promotions.ends_at is null or product_promotions.ends_at >= now())
    )
  );

create policy "Admins can manage catalog banners"
  on public.catalog_banners for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace view public.catalog_products
with (security_invoker = true)
as
select
  produtos.id,
  produtos.nome,
  produtos.descricao,
  produtos.preco as base_price,
  case
    when active_promotion.id is null then produtos.preco
    else round(produtos.preco * (100 - active_promotion.discount_percent) / 100, 2)
  end as effective_price,
  produtos.sku_sankhya,
  produtos.imagem_url,
  produtos.pais,
  produtos.regiao,
  produtos.tipo,
  produtos.uva,
  produtos.estoque,
  produtos.publicado,
  produtos.criado_em,
  active_promotion.id as promotion_id,
  active_promotion.title as promotion_title,
  active_promotion.slug as promotion_slug,
  active_promotion.discount_percent
from public.produtos
left join lateral (
  select
    product_promotions.id,
    product_promotions.title,
    product_promotions.slug,
    product_promotions.discount_percent
  from public.product_promotion_items
  join public.product_promotions
    on product_promotions.id = product_promotion_items.promotion_id
  where product_promotion_items.product_id = produtos.id
    and product_promotions.is_active = true
    and (product_promotions.starts_at is null or product_promotions.starts_at <= now())
    and (product_promotions.ends_at is null or product_promotions.ends_at >= now())
  order by product_promotions.discount_percent desc, product_promotions.created_at asc
  limit 1
) as active_promotion on true
where produtos.publicado = true;

revoke all on public.catalog_products from public, anon, authenticated;
grant select on public.catalog_products to anon, authenticated;

alter table public.order_items
  add column if not exists base_unit_price numeric(10, 2),
  add column if not exists discount_percent integer,
  add column if not exists product_promotion_id uuid references public.product_promotions(id) on delete set null;

update public.order_items
set base_unit_price = unit_price
where base_unit_price is null;

alter table public.order_items
  alter column base_unit_price set not null,
  add constraint order_items_base_unit_price_nonnegative check (base_unit_price >= 0),
  add constraint order_items_discount_percent_valid check (
    discount_percent is null or discount_percent between 1 and 90
  );

create index order_items_product_promotion_idx
  on public.order_items (product_promotion_id)
  where product_promotion_id is not null;

create or replace function public.save_product_promotion_campaign(
  p_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_discount_percent integer,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_is_active boolean,
  p_product_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem gerenciar campanhas.';
  end if;

  if coalesce(array_length(p_product_ids, 1), 0) = 0 then
    raise exception 'Selecione pelo menos um produto.';
  end if;

  insert into public.product_promotions (
    id, title, slug, description, discount_percent, starts_at, ends_at, is_active, updated_at
  ) values (
    v_id,
    trim(p_title),
    lower(trim(p_slug)),
    nullif(trim(coalesce(p_description, '')), ''),
    p_discount_percent,
    p_starts_at,
    p_ends_at,
    coalesce(p_is_active, false),
    now()
  )
  on conflict (id) do update set
    title = excluded.title,
    slug = excluded.slug,
    description = excluded.description,
    discount_percent = excluded.discount_percent,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    is_active = excluded.is_active,
    updated_at = now();

  delete from public.product_promotion_items where promotion_id = v_id;

  insert into public.product_promotion_items (promotion_id, product_id)
  select v_id, product_id
  from unnest(p_product_ids) as product_id
  join public.produtos on produtos.id = product_id
  group by product_id;

  if not found then
    raise exception 'Nenhum produto valido foi selecionado.';
  end if;

  return v_id;
end;
$$;

revoke all on function public.save_product_promotion_campaign(
  uuid, text, text, text, integer, timestamptz, timestamptz, boolean, uuid[]
) from public, anon, authenticated;
grant execute on function public.save_product_promotion_campaign(
  uuid, text, text, text, integer, timestamptz, timestamptz, boolean, uuid[]
) to authenticated;

create or replace function app_private.create_order_with_stock_reservation(
  p_cart_items jsonb,
  p_delivery_method text,
  p_payment_method text default null,
  p_delivery_address text default null,
  p_promotion_code text default null,
  p_delivery_zip_code text default null,
  p_customer_name text default null,
  p_customer_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_subtotal numeric(10, 2);
  v_pickup_discount numeric(10, 2) := 0;
  v_promotion_discount numeric(10, 2) := 0;
  v_discount numeric(10, 2) := 0;
  v_total numeric(10, 2);
  v_shipping_fee numeric(10, 2) := 0;
  v_promotion_code text := upper(regexp_replace(coalesce(p_promotion_code, ''), '\s+', '', 'g'));
  v_delivery_zip_code text := regexp_replace(coalesce(p_delivery_zip_code, ''), '\D', '', 'g');
  v_delivery_zone_name text := null;
  v_delivery_estimate_days integer := null;
  v_promotion public.promotions%rowtype;
  v_delivery_zone public.delivery_zones%rowtype;
  v_item record;
  v_updated_count integer;
begin
  if v_user_id is null then
    raise exception 'Nao autenticado.';
  end if;

  if coalesce(jsonb_typeof(p_cart_items), '') <> 'array' or jsonb_array_length(p_cart_items) = 0 then
    raise exception 'Pedido invalido.';
  end if;

  if not exists (
    with parsed_items as (
      select item.id::uuid as product_id,
             greatest(1, coalesce(item.quantity, 1))::integer as quantity
      from jsonb_to_recordset(p_cart_items) as item(id text, quantity numeric)
    )
    select 1 from parsed_items
  ) then
    raise exception 'Pedido invalido.';
  end if;

  if exists (
    with parsed_items as (
      select item.id::uuid as product_id,
             greatest(1, coalesce(item.quantity, 1))::integer as quantity
      from jsonb_to_recordset(p_cart_items) as item(id text, quantity numeric)
    ),
    checkout_items as (
      select product_id, sum(quantity)::integer as quantity
      from parsed_items group by product_id
    )
    select 1
    from checkout_items
    left join public.produtos on produtos.id = checkout_items.product_id
    where produtos.id is null or produtos.publicado is not true
  ) then
    raise exception 'Nao foi possivel validar os produtos.';
  end if;

  if exists (
    with parsed_items as (
      select item.id::uuid as product_id,
             greatest(1, coalesce(item.quantity, 1))::integer as quantity
      from jsonb_to_recordset(p_cart_items) as item(id text, quantity numeric)
    ),
    checkout_items as (
      select product_id, sum(quantity)::integer as quantity
      from parsed_items group by product_id
    )
    select 1
    from checkout_items
    join public.produtos on produtos.id = checkout_items.product_id
    where nullif(trim(produtos.sku_sankhya), '') is null
  ) then
    raise exception 'Produto sem codigo de estoque.';
  end if;

  if exists (
    with parsed_items as (
      select item.id::uuid as product_id,
             greatest(1, coalesce(item.quantity, 1))::integer as quantity
      from jsonb_to_recordset(p_cart_items) as item(id text, quantity numeric)
    ),
    checkout_items as (
      select product_id, sum(quantity)::integer as quantity
      from parsed_items group by product_id
    )
    select 1
    from checkout_items
    join public.produtos on produtos.id = checkout_items.product_id
    left join public.stock_levels on stock_levels.product_code = trim(produtos.sku_sankhya)
    where coalesce(stock_levels.quantity, -1) < checkout_items.quantity
  ) then
    raise exception 'Estoque insuficiente para concluir o pedido.';
  end if;

  with parsed_items as (
    select item.id::uuid as product_id,
           greatest(1, coalesce(item.quantity, 1))::integer as quantity
    from jsonb_to_recordset(p_cart_items) as item(id text, quantity numeric)
  ),
  checkout_items as (
    select product_id, sum(quantity)::integer as quantity
    from parsed_items group by product_id
  )
  select coalesce(sum(checkout_items.quantity * catalog_products.effective_price), 0)::numeric(10, 2)
    into v_subtotal
  from checkout_items
  join public.catalog_products on catalog_products.id = checkout_items.product_id;

  if p_delivery_method = 'Retirada na Loja' then
    v_pickup_discount := (v_subtotal * 0.1)::numeric(10, 2);
  end if;

  if v_promotion_code <> '' then
    select * into v_promotion
    from public.promotions
    where code = v_promotion_code
      and is_active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    limit 1;

    if not found then
      raise exception 'Cupom invalido ou expirado.';
    end if;

    if v_subtotal < v_promotion.min_subtotal then
      raise exception 'Cupom nao atende ao valor minimo do pedido.';
    end if;

    v_promotion_discount := case
      when v_promotion.discount_type = 'percent'
        then v_subtotal * (v_promotion.discount_value / 100)
      else v_promotion.discount_value
    end;

    if v_promotion.max_discount is not null then
      v_promotion_discount := least(v_promotion_discount, v_promotion.max_discount);
    end if;

    v_promotion_discount := least(v_subtotal, greatest(0, v_promotion_discount))::numeric(10, 2);
  else
    v_promotion_code := null;
  end if;

  v_discount := least(v_subtotal, v_pickup_discount + v_promotion_discount)::numeric(10, 2);

  if p_delivery_method = 'Entrega no Endereco' then
    if length(v_delivery_zip_code) <> 8 then
      raise exception 'Informe um CEP valido para entrega.';
    end if;

    select * into v_delivery_zone
    from public.delivery_zones
    where is_active = true
      and zip_start <= v_delivery_zip_code
      and zip_end >= v_delivery_zip_code
    order by fee asc
    limit 1;

    if not found then
      raise exception 'Ainda nao entregamos neste CEP.';
    end if;

    v_shipping_fee := case
      when v_delivery_zone.free_shipping_min_subtotal is not null
        and v_subtotal >= v_delivery_zone.free_shipping_min_subtotal then 0
      else v_delivery_zone.fee
    end;
    v_delivery_zone_name := v_delivery_zone.name;
    v_delivery_estimate_days := v_delivery_zone.estimate_days;
  else
    v_delivery_zip_code := null;
  end if;

  v_total := (v_subtotal - v_discount + v_shipping_fee)::numeric(10, 2);

  insert into public.orders (
    user_id, status, total_amount, delivery_type, payment_method, delivery_address,
    discount_amount, subtotal_amount, promotion_code, delivery_zip_code,
    delivery_zone_name, delivery_estimate_days, shipping_fee, customer_name, customer_phone
  ) values (
    v_user_id, 'pending', v_total, p_delivery_method, p_payment_method, p_delivery_address,
    v_discount, v_subtotal, v_promotion_code, v_delivery_zip_code,
    v_delivery_zone_name, v_delivery_estimate_days, v_shipping_fee,
    nullif(trim(coalesce(p_customer_name, '')), ''),
    nullif(trim(coalesce(p_customer_phone, '')), '')
  ) returning id into v_order_id;

  insert into public.order_items (
    order_id, wine_id, product_id, product_name, quantity, unit_price,
    base_unit_price, discount_percent, product_promotion_id
  )
  with parsed_items as (
    select item.id::uuid as product_id,
           nullif(trim(item.name), '') as requested_name,
           greatest(1, coalesce(item.quantity, 1))::integer as quantity
    from jsonb_to_recordset(p_cart_items) as item(id text, name text, quantity numeric)
  ),
  checkout_items as (
    select product_id, max(requested_name) as requested_name, sum(quantity)::integer as quantity
    from parsed_items group by product_id
  )
  select
    v_order_id,
    null,
    checkout_items.product_id,
    coalesce(checkout_items.requested_name, catalog_products.nome),
    checkout_items.quantity,
    catalog_products.effective_price,
    catalog_products.base_price,
    catalog_products.discount_percent,
    catalog_products.promotion_id
  from checkout_items
  join public.catalog_products on catalog_products.id = checkout_items.product_id;

  for v_item in
    with parsed_items as (
      select item.id::uuid as product_id,
             greatest(1, coalesce(item.quantity, 1))::integer as quantity
      from jsonb_to_recordset(p_cart_items) as item(id text, quantity numeric)
    ),
    checkout_items as (
      select product_id, sum(quantity)::integer as quantity
      from parsed_items group by product_id
    )
    select checkout_items.product_id,
           trim(produtos.sku_sankhya) as product_code,
           checkout_items.quantity
    from checkout_items
    join public.produtos on produtos.id = checkout_items.product_id
  loop
    update public.stock_levels
      set quantity = quantity - v_item.quantity,
          updated_at = now(),
          source = 'order'
      where product_code = v_item.product_code
        and quantity >= v_item.quantity;

    get diagnostics v_updated_count = row_count;

    if v_updated_count <> 1 then
      raise exception 'Estoque insuficiente para concluir o pedido.';
    end if;

    update public.produtos
      set estoque = greatest(estoque - v_item.quantity, 0)
      where id = v_item.product_id;
  end loop;

  update public.orders
    set stock_reserved_at = now()
    where id = v_order_id;

  return v_order_id;
end;
$$;

revoke all on function app_private.create_order_with_stock_reservation(
  jsonb, text, text, text, text, text, text, text
) from public, anon, authenticated;

notify pgrst, 'reload schema';
