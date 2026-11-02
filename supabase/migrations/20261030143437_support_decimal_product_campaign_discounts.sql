-- Campaigns retain their exact discount for pricing while catalog UI rounds it
-- only when presenting the offer to customers.
-- Recreate the projection because PostgreSQL will not alter a column used by a
-- view in-place. This runs in the same transaction as the type change.
drop view public.catalog_products;

alter table public.product_promotions
  drop constraint if exists product_promotions_discount_percent_check;

alter table public.product_promotions
  alter column discount_percent type numeric(5, 2)
    using discount_percent::numeric(5, 2);

alter table public.product_promotions
  add constraint product_promotions_discount_percent_check
    check (discount_percent between 1 and 90);

-- Keep the applied percentage recorded on new order items at the same precision.
alter table public.order_items
  drop constraint if exists order_items_discount_percent_valid;

alter table public.order_items
  alter column discount_percent type numeric(5, 2)
    using discount_percent::numeric(5, 2);

alter table public.order_items
  add constraint order_items_discount_percent_valid
    check (discount_percent is null or discount_percent between 1 and 90);

drop function if exists public.save_product_promotion_campaign(
  uuid, text, text, text, integer, timestamptz, timestamptz, boolean, boolean, uuid[]
);

create function public.save_product_promotion_campaign(
  p_id uuid, p_title text, p_slug text, p_description text,
  p_discount_percent numeric, p_starts_at timestamptz, p_ends_at timestamptz,
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
  if p_discount_percent is null or p_discount_percent < 1 or p_discount_percent > 90
    or p_discount_percent <> round(p_discount_percent, 2) then
    raise exception 'O desconto deve estar entre 1 e 90 por cento, com até duas casas decimais.';
  end if;
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

revoke all on function public.save_product_promotion_campaign(uuid, text, text, text, numeric, timestamptz, timestamptz, boolean, boolean, uuid[]) from public, anon, authenticated;
grant execute on function public.save_product_promotion_campaign(uuid, text, text, text, numeric, timestamptz, timestamptz, boolean, boolean, uuid[]) to authenticated;

create view public.catalog_products
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

revoke all on public.catalog_products from public, anon, authenticated;
grant select on public.catalog_products to anon, authenticated;

notify pgrst, 'reload schema';
