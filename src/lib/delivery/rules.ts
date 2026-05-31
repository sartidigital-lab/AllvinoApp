import { DeliveryZone } from '@/types/database';

export function normalizeZipCode(value: string) {
  return value.replace(/\D/g, '').slice(0, 8);
}

export function formatZipCode(value: string) {
  const normalized = normalizeZipCode(value);
  if (normalized.length <= 5) return normalized;
  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
}

export function calculateShippingFee(zone: DeliveryZone, subtotal: number) {
  if (
    zone.free_shipping_min_subtotal !== null &&
    subtotal >= zone.free_shipping_min_subtotal
  ) {
    return 0;
  }

  return Math.max(0, Number(zone.fee.toFixed(2)));
}

export function zipMatchesZone(zipCode: string, zone: DeliveryZone) {
  const normalized = normalizeZipCode(zipCode);
  return normalized.length === 8 && normalized >= zone.zip_start && normalized <= zone.zip_end;
}
