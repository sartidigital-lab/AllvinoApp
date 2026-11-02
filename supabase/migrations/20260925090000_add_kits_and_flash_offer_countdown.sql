-- Kits are regular sellable catalog products with their own SKU and stock. Their
-- composition is kept separately so it can evolve without changing checkout items.
alter table public.produtos
  add column if not exists tipo_produto text not null default 'wine'
    check (tipo_produto in ('wine', 'kit'));

alter table public.product_promotions
  add column if not exists show_countdown boolean not null default false;

create table if not exists public.product_kit_items (
  kit_id uuid not null references public.produtos(id) on delete cascade,
  product_id uuid not null references public.produtos(id) on delete restrict,
  quantity integer not null check (quantity > 0 and quantity <= 999),
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (kit_id, product_id),
  check (kit_id <> product_id)
);

create index if not exists product_kit_items_product_idx on public.product_kit_items(product_id);

alter table public.product_kit_items enable row level security;
grant select on public.product_kit_items to anon, authenticated;

drop policy if exists "Public can read kit compositions" on public.product_kit_items;
create policy "Public can read kit compositions"
  on public.product_kit_items for select to anon, authenticated using (true);

drop policy if exists "Admins can manage kit compositions" on public.product_kit_items;
create policy "Admins can manage kit compositions"
  on public.product_kit_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Replace the catalog projection to return the promotion end time for the card
-- countdown and the number of items in each kit.
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
  active_promotion.discount_percent,
  produtos.tipo_produto,
  coalesce(kit_items.item_count, 0)::integer as kit_item_count,
  active_promotion.ends_at as promotion_ends_at,
  coalesce(active_promotion.show_countdown, false) as show_countdown
from public.produtos
left join lateral (
  select count(*)::integer as item_count
  from public.product_kit_items
  where product_kit_items.kit_id = produtos.id
) as kit_items on true
left join lateral (
  select
    product_promotions.id,
    product_promotions.title,
    product_promotions.slug,
    product_promotions.discount_percent,
    product_promotions.ends_at,
    product_promotions.show_countdown
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

-- The explicit function keeps creation/update of a kit atomic and ensures a kit
-- can only contain existing, non-kit catalog products.
create or replace function public.save_product_kit(
  p_id uuid,
  p_name text,
  p_description text,
  p_price numeric,
  p_product_code text,
  p_image_url text,
  p_stock integer,
  p_published boolean,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_item_count integer;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem gerenciar kits.';
  end if;
  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'Informe o nome do kit.';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'Informe um preço válido para o kit.';
  end if;
  if nullif(trim(coalesce(p_product_code, '')), '') is null then
    raise exception 'Informe o SKU do kit para controlar seu saldo manual.';
  end if;
  if p_stock is null or p_stock < 0 then
    raise exception 'Informe um saldo válido para o kit.';
  end if;
  if coalesce(jsonb_typeof(p_items), '') <> 'array' then
    raise exception 'Informe os itens do kit.';
  end if;

  select count(*) into v_item_count
  from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
  where item.product_id is not null and item.quantity between 1 and 999;
  if v_item_count = 0 then
    raise exception 'Adicione pelo menos um item ao kit.';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
    left join public.produtos product on product.id = item.product_id
    where product.id is null or product.tipo_produto = 'kit' or item.quantity not between 1 and 999
  ) then
    raise exception 'Os itens do kit precisam ser produtos válidos.';
  end if;

  insert into public.produtos (
    id, nome, descricao, preco, sku_sankhya, imagem_url, estoque, publicado, tipo_produto
  ) values (
    v_id, trim(p_name), nullif(trim(coalesce(p_description, '')), ''), p_price,
    trim(p_product_code), nullif(trim(coalesce(p_image_url, '')), ''), p_stock,
    coalesce(p_published, true), 'kit'
  )
  on conflict (id) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    sku_sankhya = excluded.sku_sankhya, imagem_url = excluded.imagem_url,
    estoque = excluded.estoque, publicado = excluded.publicado, tipo_produto = 'kit';

  delete from public.product_kit_items where kit_id = v_id;
  insert into public.product_kit_items (kit_id, product_id, quantity)
  select v_id, item.product_id, item.quantity
  from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
  group by item.product_id, item.quantity;

  return v_id;
end;
$$;

revoke all on function public.save_product_kit(uuid, text, text, numeric, text, text, integer, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.save_product_kit(uuid, text, text, numeric, text, text, integer, boolean, jsonb) to authenticated;

-- Extend the campaign writer without changing existing campaigns: countdown is
-- opt-in and needs an end time, which the UI enforces before saving.
drop function if exists public.save_product_promotion_campaign(uuid, text, text, text, integer, timestamptz, timestamptz, boolean, uuid[]);
create function public.save_product_promotion_campaign(
  p_id uuid, p_title text, p_slug text, p_description text,
  p_discount_percent integer, p_starts_at timestamptz, p_ends_at timestamptz,
  p_is_active boolean, p_show_countdown boolean, p_product_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid := coalesce(p_id, gen_random_uuid());
begin
  if not public.is_admin() then raise exception 'Apenas administradores podem gerenciar campanhas.'; end if;
  if coalesce(array_length(p_product_ids, 1), 0) = 0 then raise exception 'Selecione pelo menos um produto.'; end if;
  if coalesce(p_show_countdown, false) and p_ends_at is null then raise exception 'Ofertas relâmpago precisam de data final.'; end if;
  insert into public.product_promotions (id, title, slug, description, discount_percent, starts_at, ends_at, is_active, show_countdown, updated_at)
  values (v_id, trim(p_title), lower(trim(p_slug)), nullif(trim(coalesce(p_description, '')), ''), p_discount_percent, p_starts_at, p_ends_at, coalesce(p_is_active, false), coalesce(p_show_countdown, false), now())
  on conflict (id) do update set title = excluded.title, slug = excluded.slug, description = excluded.description,
    discount_percent = excluded.discount_percent, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
    is_active = excluded.is_active, show_countdown = excluded.show_countdown, updated_at = now();
  delete from public.product_promotion_items where promotion_id = v_id;
  insert into public.product_promotion_items (promotion_id, product_id)
  select v_id, product_id from unnest(p_product_ids) as product_id join public.produtos on produtos.id = product_id group by product_id;
  if not found then raise exception 'Nenhum produto válido foi selecionado.'; end if;
  return v_id;
end;
$$;

revoke all on function public.save_product_promotion_campaign(uuid, text, text, text, integer, timestamptz, timestamptz, boolean, boolean, uuid[]) from public, anon, authenticated;
grant execute on function public.save_product_promotion_campaign(uuid, text, text, text, integer, timestamptz, timestamptz, boolean, boolean, uuid[]) to authenticated;

-- PIX is a 5% incentive. This replacement applies it server-side for every
-- new order, preventing a client from choosing the total.
create or replace function app_private.apply_pix_checkout_discount()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_subtotal numeric(10, 2) := greatest(0, coalesce(new.subtotal_amount, 0));
  v_existing_discount numeric(10, 2) := greatest(0, coalesce(new.discount_amount, 0));
begin
  if new.payment_method <> 'Pix' then return new; end if;
  new.discount_amount := least(v_subtotal, v_existing_discount + (v_subtotal * 0.05))::numeric(10, 2);
  new.total_amount := (v_subtotal - new.discount_amount + greatest(0, coalesce(new.shipping_fee, 0)))::numeric(10, 2);
  return new;
end;
$$;

notify pgrst, 'reload schema';
