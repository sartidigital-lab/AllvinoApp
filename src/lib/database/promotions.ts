import { Promotion } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import {
  calculatePromotionDiscount,
  isPromotionCurrentlyActive,
  normalizePromotionCode,
} from '@/lib/promotions/rules';

export type PromotionPayload = Omit<Promotion, 'id' | 'created_at' | 'updated_at'>;

export type PromotionDiscount = {
  promotion: Promotion;
  discount: number;
};
export { calculatePromotionDiscount, isPromotionCurrentlyActive, normalizePromotionCode };

export async function fetchPromotions(): Promise<{ promotions: Promotion[]; error: Error | null }> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('id,created_at,updated_at,code,title,description,discount_type,discount_value,min_subtotal,max_discount,starts_at,ends_at,is_active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { promotions: (data || []) as Promotion[], error: null };
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return { promotions: [], error: error as Error };
  }
}

export async function fetchActivePromotionByCode(code: string): Promise<{
  promotion: Promotion | null;
  error: Error | null;
}> {
  const normalizedCode = normalizePromotionCode(code);
  if (!normalizedCode) return { promotion: null, error: null };

  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('id,created_at,updated_at,code,title,description,discount_type,discount_value,min_subtotal,max_discount,starts_at,ends_at,is_active')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (error) throw error;
    const promotion = data as Promotion | null;

    if (!promotion || !isPromotionCurrentlyActive(promotion)) {
      return { promotion: null, error: null };
    }

    return { promotion, error: null };
  } catch (error) {
    console.error('Error fetching promotion:', error);
    return { promotion: null, error: error as Error };
  }
}

export async function savePromotion(
  payload: PromotionPayload,
  id?: string
): Promise<{ promotion: Promotion | null; error: Error | null }> {
  const supabase = createClient();

  try {
    const normalizedPayload = {
      ...payload,
      code: normalizePromotionCode(payload.code),
      description: payload.description?.trim() || null,
      starts_at: payload.starts_at || null,
      ends_at: payload.ends_at || null,
      max_discount: payload.max_discount || null,
      updated_at: new Date().toISOString(),
    };

    const query = id
      ? supabase.from('promotions').update(normalizedPayload).eq('id', id)
      : supabase.from('promotions').insert(normalizedPayload);

    const { data, error } = await query
      .select('id,created_at,updated_at,code,title,description,discount_type,discount_value,min_subtotal,max_discount,starts_at,ends_at,is_active')
      .single();

    if (error) throw error;

    return { promotion: data as Promotion, error: null };
  } catch (error) {
    console.error('Error saving promotion:', error);
    return { promotion: null, error: error as Error };
  }
}

export async function deletePromotion(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  return !error;
}
