-- A campaign discount is always calculated from the public "DE" price.
-- The normal "POR" price remains available outside a campaign; checkout-only
-- reductions (coupon, pickup and PIX) are applied later to effective_price.
create or replace view public.catalog_products
with (security_invoker = true)
as
select
  produtos.id,
  produtos.nome,
  produtos.descricao,
  coalesce(produtos.preco_original, produtos.preco) as base_price,
  case
    when active_promotion.id is null then produtos.preco
    else round(
      coalesce(produtos.preco_original, produtos.preco)
        * (100 - active_promotion.discount_percent) / 100,
      2
    )
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
  case
    when active_promotion.id is not null then active_promotion.discount_percent
    when produtos.preco_original > produtos.preco then round(
      100 * (1 - produtos.preco / nullif(produtos.preco_original, 0))
    )::integer
    else null
  end as discount_percent,
  produtos.tipo_produto,
  coalesce(kit_items.item_count, 0)::integer as kit_item_count,
  active_promotion.ends_at as promotion_ends_at,
  coalesce(active_promotion.show_countdown, false) as show_countdown
from public.produtos
left join lateral (
  select coalesce(sum(product_kit_items.quantity), 0)::integer as item_count
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

notify pgrst, 'reload schema';
