import { createClient } from '@/utils/supabase/client';
import type { CatalogBanner, ProductPromotionCampaign } from '@/types/database';

const campaignSelect = 'id,created_at,updated_at,title,slug,description,discount_percent,starts_at,ends_at,is_active,product_promotion_items(product_id)';
const bannerSelect = 'id,created_at,updated_at,promotion_id,eyebrow,title,subtitle,cta_label,image_url,mobile_image_url,image_alt,theme,show_text,show_cta,show_discount_badge,sort_order,starts_at,ends_at,is_active,product_promotions(title,slug,discount_percent)';

type CampaignRow = Omit<ProductPromotionCampaign, 'product_ids'> & {
  product_promotion_items?: Array<{ product_id: string }>;
};

type BannerRow = Omit<CatalogBanner, 'promotion_title' | 'promotion_slug' | 'discount_percent'> & {
  product_promotions?: { title: string; slug: string; discount_percent: number } | Array<{ title: string; slug: string; discount_percent: number }> | null;
};

export type ProductPromotionCampaignPayload = Omit<
  ProductPromotionCampaign,
  'id' | 'created_at' | 'updated_at'
>;

export type CatalogBannerPayload = Omit<
  CatalogBanner,
  'id' | 'created_at' | 'updated_at' | 'promotion_title' | 'promotion_slug' | 'discount_percent'
>;

function mapCampaign(row: CampaignRow): ProductPromotionCampaign {
  const { product_promotion_items, ...campaign } = row;
  return {
    ...campaign,
    discount_percent: Number(campaign.discount_percent),
    product_ids: (product_promotion_items || []).map((item) => item.product_id),
  };
}

function mapBanner(row: BannerRow): CatalogBanner {
  const { product_promotions, ...banner } = row;
  const promotion = Array.isArray(product_promotions) ? product_promotions[0] : product_promotions;
  return {
    ...banner,
    sort_order: Number(banner.sort_order),
    promotion_title: promotion?.title || '',
    promotion_slug: promotion?.slug || '',
    discount_percent: Number(promotion?.discount_percent || 0),
  };
}

export async function fetchProductPromotionCampaigns() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('product_promotions')
    .select(campaignSelect)
    .order('created_at', { ascending: false });

  return {
    campaigns: error ? [] : ((data || []) as unknown as CampaignRow[]).map(mapCampaign),
    error: error ? new Error(error.message) : null,
  };
}

export async function saveProductPromotionCampaign(
  payload: ProductPromotionCampaignPayload,
  id?: string
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('save_product_promotion_campaign', {
    p_id: id || null,
    p_title: payload.title.trim(),
    p_slug: payload.slug.trim().toLowerCase(),
    p_description: payload.description?.trim() || null,
    p_discount_percent: payload.discount_percent,
    p_starts_at: payload.starts_at,
    p_ends_at: payload.ends_at,
    p_is_active: payload.is_active,
    p_product_ids: payload.product_ids,
  });

  return { id: data as string | null, error: error ? new Error(error.message) : null };
}

export async function deleteProductPromotionCampaign(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('product_promotions').delete().eq('id', id);
  return error ? new Error(error.message) : null;
}

export async function fetchCatalogBanners() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('catalog_banners')
    .select(bannerSelect)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  return {
    banners: error ? [] : ((data || []) as unknown as BannerRow[]).map(mapBanner),
    error: error ? new Error(error.message) : null,
  };
}

export async function saveCatalogBanner(payload: CatalogBannerPayload, id?: string) {
  const supabase = createClient();
  const normalizedPayload = {
    ...payload,
    eyebrow: payload.eyebrow?.trim() || null,
    title: payload.title.trim(),
    subtitle: payload.subtitle?.trim() || null,
    cta_label: payload.cta_label.trim() || 'Ver seleção',
    image_url: payload.image_url?.trim() || null,
    mobile_image_url: payload.mobile_image_url?.trim() || null,
    image_alt: payload.image_alt?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const query = id
    ? supabase.from('catalog_banners').update(normalizedPayload).eq('id', id)
    : supabase.from('catalog_banners').insert(normalizedPayload);
  const { data, error } = await query.select(bannerSelect).single();

  return {
    banner: data ? mapBanner(data as unknown as BannerRow) : null,
    error: error ? new Error(error.message) : null,
  };
}

export async function deleteCatalogBanner(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('catalog_banners').delete().eq('id', id);
  return error ? new Error(error.message) : null;
}
