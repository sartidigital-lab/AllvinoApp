-- A Kit can have its own regular price ("De") and sale price ("Por"),
-- independently from optional catalog campaigns.
alter table public.produtos
  add column if not exists preco_original numeric(10, 2);

alter table public.produtos
  drop constraint if exists produtos_preco_original_valid;

alter table public.produtos
  add constraint produtos_preco_original_valid
  check (preco_original is null or (preco_original >= 0 and preco_original >= preco));

-- The catalog exposes the reference price plus the effective sale price. A
-- campaign is applied to the current selling price, so it can still include a
-- Kit that already has a configured "De" / "Por" price.
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
  case
    when active_promotion.id is not null then round(
      100 * (1 - (
        round(produtos.preco * (100 - active_promotion.discount_percent) / 100, 2)
        / nullif(coalesce(produtos.preco_original, produtos.preco), 0)
      ))
    )::integer
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

drop function if exists public.save_product_kit(uuid, text, text, numeric, text, text, integer, boolean, jsonb);

create function public.save_product_kit(
  p_id uuid,
  p_name text,
  p_description text,
  p_price numeric,
  p_original_price numeric,
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
    raise exception 'Informe um preço “Por” válido para o kit.';
  end if;
  if p_original_price is not null and (p_original_price < 0 or p_original_price < p_price) then
    raise exception 'O preço “De” não pode ser menor que o preço “Por”.';
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
    id, nome, descricao, preco, preco_original, sku_sankhya, imagem_url, estoque, publicado, tipo_produto
  ) values (
    v_id, trim(p_name), nullif(trim(coalesce(p_description, '')), ''), p_price, p_original_price,
    trim(p_product_code), nullif(trim(coalesce(p_image_url, '')), ''), p_stock,
    coalesce(p_published, true), 'kit'
  )
  on conflict (id) do update set
    nome = excluded.nome, descricao = excluded.descricao, preco = excluded.preco,
    preco_original = excluded.preco_original, sku_sankhya = excluded.sku_sankhya,
    imagem_url = excluded.imagem_url, estoque = excluded.estoque,
    publicado = excluded.publicado, tipo_produto = 'kit';

  delete from public.product_kit_items where kit_id = v_id;
  insert into public.product_kit_items (kit_id, product_id, quantity)
  select v_id, item.product_id, item.quantity
  from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
  group by item.product_id, item.quantity;

  return v_id;
end;
$$;

revoke all on function public.save_product_kit(uuid, text, text, numeric, numeric, text, text, integer, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.save_product_kit(uuid, text, text, numeric, numeric, text, text, integer, boolean, jsonb) to authenticated;

notify pgrst, 'reload schema';
