alter table public.catalog_banners
  add column if not exists cta_text_color text not null default '#000000';

alter table public.catalog_banners
  drop constraint if exists catalog_banners_cta_text_color_check;

alter table public.catalog_banners
  add constraint catalog_banners_cta_text_color_check
  check (cta_text_color ~ '^#[0-9A-Fa-f]{6}$');

drop function if exists public.save_catalog_banner_campaign(
  uuid, uuid, text, text, text, integer, timestamptz, timestamptz,
  boolean, uuid[], text, text, text, text, text, text, integer,
  boolean, boolean, boolean
);

create function public.save_catalog_banner_campaign(
  p_banner_id uuid,
  p_promotion_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_discount_percent integer,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_is_active boolean,
  p_product_ids uuid[],
  p_eyebrow text,
  p_cta_label text,
  p_cta_text_color text,
  p_image_url text,
  p_mobile_image_url text,
  p_image_alt text,
  p_sort_order integer,
  p_show_text boolean,
  p_show_cta boolean,
  p_show_discount_badge boolean
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_promotion_id uuid := coalesce(p_promotion_id, gen_random_uuid());
  v_banner_id uuid := coalesce(p_banner_id, gen_random_uuid());
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem gerenciar banners.';
  end if;

  if length(trim(coalesce(p_title, ''))) not between 2 and 120 then
    raise exception 'O titulo deve ter entre 2 e 120 caracteres.';
  end if;

  if p_discount_percent not between 1 and 90 then
    raise exception 'O desconto deve estar entre 1 e 90 por cento.';
  end if;

  if length(trim(coalesce(p_cta_label, ''))) not between 2 and 40 then
    raise exception 'O texto do botao deve ter entre 2 e 40 caracteres.';
  end if;

  if trim(coalesce(p_cta_text_color, '')) !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'A cor do texto do botao deve estar no formato hexadecimal.';
  end if;

  if nullif(trim(coalesce(p_image_url, '')), '') is null then
    raise exception 'A imagem desktop e obrigatoria.';
  end if;

  if p_sort_order not between 0 and 999 then
    raise exception 'A ordem deve estar entre 0 e 999.';
  end if;

  if p_starts_at is not null and p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'A data final deve ser posterior ao inicio.';
  end if;

  if coalesce(cardinality(p_product_ids), 0) = 0 then
    raise exception 'Selecione pelo menos um produto publicado.';
  end if;

  if exists (
    select 1
    from unnest(p_product_ids) as selected(product_id)
    left join public.produtos as product
      on product.id = selected.product_id
      and product.publicado = true
    where product.id is null
  ) then
    raise exception 'A campanha contem um produto inexistente ou nao publicado.';
  end if;

  insert into public.product_promotions (
    id, title, slug, description, discount_percent, starts_at, ends_at, is_active, updated_at
  ) values (
    v_promotion_id,
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

  delete from public.product_promotion_items
  where promotion_id = v_promotion_id;

  insert into public.product_promotion_items (promotion_id, product_id)
  select v_promotion_id, selected.product_id
  from unnest(p_product_ids) as selected(product_id)
  group by selected.product_id;

  insert into public.catalog_banners (
    id, promotion_id, eyebrow, title, subtitle, cta_label, cta_text_color,
    image_url, mobile_image_url, image_alt, sort_order,
    starts_at, ends_at, is_active, show_text, show_cta,
    show_discount_badge, updated_at
  ) values (
    v_banner_id,
    v_promotion_id,
    nullif(trim(coalesce(p_eyebrow, '')), ''),
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    trim(p_cta_label),
    upper(trim(p_cta_text_color)),
    trim(p_image_url),
    nullif(trim(coalesce(p_mobile_image_url, '')), ''),
    nullif(trim(coalesce(p_image_alt, '')), ''),
    p_sort_order,
    p_starts_at,
    p_ends_at,
    coalesce(p_is_active, false),
    coalesce(p_show_text, false),
    coalesce(p_show_cta, false),
    coalesce(p_show_discount_badge, false),
    now()
  )
  on conflict (id) do update set
    promotion_id = excluded.promotion_id,
    eyebrow = excluded.eyebrow,
    title = excluded.title,
    subtitle = excluded.subtitle,
    cta_label = excluded.cta_label,
    cta_text_color = excluded.cta_text_color,
    image_url = excluded.image_url,
    mobile_image_url = excluded.mobile_image_url,
    image_alt = excluded.image_alt,
    sort_order = excluded.sort_order,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    is_active = excluded.is_active,
    show_text = excluded.show_text,
    show_cta = excluded.show_cta,
    show_discount_badge = excluded.show_discount_badge,
    updated_at = now();

  return v_banner_id;
end;
$$;

revoke all on function public.save_catalog_banner_campaign(
  uuid, uuid, text, text, text, integer, timestamptz, timestamptz,
  boolean, uuid[], text, text, text, text, text, text, integer,
  boolean, boolean, boolean
) from public, anon, authenticated;

grant execute on function public.save_catalog_banner_campaign(
  uuid, uuid, text, text, text, integer, timestamptz, timestamptz,
  boolean, uuid[], text, text, text, text, text, text, integer,
  boolean, boolean, boolean
) to authenticated;

notify pgrst, 'reload schema';
