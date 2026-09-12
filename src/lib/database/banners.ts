import { createClient } from '@/utils/supabase/client';

export type CatalogBanner = {
  id: string;
  created_at: string;
  updated_at: string;
  promotion_id: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  cta_label: string;
  cta_text_color: string;
  image_url: string | null;
  mobile_image_url: string | null;
  image_alt: string | null;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  show_text: boolean;
  show_cta: boolean;
  show_discount_badge: boolean;
  promotion?: {
    title: string;
    slug: string;
    discount_percent: number;
    items?: { product_id: string }[];
  } | null;
};

export type CatalogBannerPayload = Omit<CatalogBanner, 'id' | 'created_at' | 'updated_at' | 'promotion_id' | 'promotion'> & {
  promotion_id?: string | null;
  promotion_slug?: string | null;
  discount_percent: number;
  product_ids: string[];
};

export function isCatalogBannerCurrentlyActive(banner: Pick<CatalogBanner, 'is_active' | 'starts_at' | 'ends_at'>, now = new Date()) {
  if (!banner.is_active) return false;
  const startsAt = banner.starts_at ? new Date(banner.starts_at) : null;
  const endsAt = banner.ends_at ? new Date(banner.ends_at) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) return false;
  if (endsAt && Number.isNaN(endsAt.getTime())) return false;
  return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
}

const bannerSelect = 'id,created_at,updated_at,promotion_id,eyebrow,title,subtitle,cta_label,cta_text_color,image_url,mobile_image_url,image_alt,sort_order,starts_at,ends_at,is_active,show_text,show_cta,show_discount_badge,promotion:product_promotions(title,slug,discount_percent,items:product_promotion_items(product_id))';

function normalizeBanner(data: unknown): CatalogBanner {
  const row = data as Record<string, unknown>;
  const relation = Array.isArray(row.promotion) ? row.promotion[0] : row.promotion;
  return { ...row, promotion: (relation || null) as CatalogBanner['promotion'] } as CatalogBanner;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'banner';
}

export async function fetchCatalogBanners(): Promise<{ banners: CatalogBanner[]; error: Error | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('catalog_banners')
    .select(bannerSelect)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching catalog banners:', error);
    return { banners: [], error: error as Error };
  }

  return { banners: (data || []).map(normalizeBanner), error: null };
}

export async function saveCatalogBanner(payload: CatalogBannerPayload, id?: string): Promise<{ banner: CatalogBanner | null; error: Error | null }> {
  const supabase = createClient();

  try {
    const slug = payload.promotion_slug || `banner-${Date.now()}-${slugify(payload.title)}`.slice(0, 120);
    const { data: bannerId, error: saveError } = await supabase.rpc('save_catalog_banner_campaign', {
      p_banner_id: id || null,
      p_promotion_id: payload.promotion_id || null,
      p_title: payload.title.trim(),
      p_slug: slug,
      p_description: payload.subtitle?.trim() || null,
      p_discount_percent: payload.discount_percent,
      p_starts_at: payload.starts_at,
      p_ends_at: payload.ends_at,
      p_is_active: payload.is_active,
      p_product_ids: payload.product_ids,
      p_eyebrow: payload.eyebrow?.trim() || null,
      p_cta_label: payload.cta_label.trim(),
      p_cta_text_color: payload.cta_text_color,
      p_image_url: payload.image_url,
      p_mobile_image_url: payload.mobile_image_url,
      p_image_alt: payload.image_alt?.trim() || null,
      p_sort_order: payload.sort_order,
      p_show_text: payload.show_text,
      p_show_cta: payload.show_cta,
      p_show_discount_badge: payload.show_discount_badge,
    });

    if (saveError || !bannerId) throw saveError || new Error('Não foi possível salvar o banner.');

    const { data, error } = await supabase
      .from('catalog_banners')
      .select(bannerSelect)
      .eq('id', bannerId)
      .single();

    if (error || !data) throw error || new Error('Banner salvo sem retorno do banco.');
    return { banner: normalizeBanner(data), error: null };
  } catch (error) {
    console.error('Error saving catalog banner:', error);
    return { banner: null, error: error as Error };
  }
}

export async function deleteCatalogBanner(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('catalog_banners').delete().eq('id', id);
  if (error) console.error('Error deleting catalog banner:', error);
  return !error;
}
