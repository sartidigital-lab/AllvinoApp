import { DeliveryZone } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import { calculateShippingFee, normalizeZipCode } from '@/lib/delivery/rules';

export type DeliveryZonePayload = Omit<DeliveryZone, 'id' | 'created_at' | 'updated_at'>;

const deliveryZoneSelect =
  'id,created_at,updated_at,name,zip_start,zip_end,fee,free_shipping_min_subtotal,estimate_days,is_active';

export async function fetchDeliveryZones(): Promise<{ zones: DeliveryZone[]; error: Error | null }> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('delivery_zones')
      .select(deliveryZoneSelect)
      .order('zip_start', { ascending: true });

    if (error) throw error;

    return { zones: (data || []) as DeliveryZone[], error: null };
  } catch (error) {
    console.error('Error fetching delivery zones:', error);
    return { zones: [], error: error as Error };
  }
}

export async function fetchDeliveryQuote(zipCode: string, subtotal: number): Promise<{
  zone: DeliveryZone | null;
  shippingFee: number;
  error: Error | null;
}> {
  const normalizedZip = normalizeZipCode(zipCode);
  if (normalizedZip.length !== 8) {
    return { zone: null, shippingFee: 0, error: null };
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('delivery_zones')
      .select(deliveryZoneSelect)
      .eq('is_active', true)
      .lte('zip_start', normalizedZip)
      .gte('zip_end', normalizedZip)
      .order('fee', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    const zone = data as DeliveryZone | null;

    return {
      zone,
      shippingFee: zone ? calculateShippingFee(zone, subtotal) : 0,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching delivery quote:', error);
    return { zone: null, shippingFee: 0, error: error as Error };
  }
}

export async function saveDeliveryZone(
  payload: DeliveryZonePayload,
  id?: string
): Promise<{ zone: DeliveryZone | null; error: Error | null }> {
  const supabase = createClient();
  const normalizedPayload = {
    ...payload,
    zip_start: normalizeZipCode(payload.zip_start),
    zip_end: normalizeZipCode(payload.zip_end),
    updated_at: new Date().toISOString(),
  };

  try {
    const query = id
      ? supabase.from('delivery_zones').update(normalizedPayload).eq('id', id)
      : supabase.from('delivery_zones').insert(normalizedPayload);

    const { data, error } = await query.select(deliveryZoneSelect).single();

    if (error) throw error;

    return { zone: data as DeliveryZone, error: null };
  } catch (error) {
    console.error('Error saving delivery zone:', error);
    return { zone: null, error: error as Error };
  }
}

export async function deleteDeliveryZone(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
  return !error;
}
