import type { CustomerCoupon } from '@/types/database';

export async function fetchCustomerCoupons(): Promise<{ coupons: CustomerCoupon[]; error: Error | null }> {
  try {
    const response = await fetch('/api/cliente/cupons', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json() as { coupons?: CustomerCoupon[]; error?: string };

    if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar os cupons.');
    return { coupons: payload.coupons || [], error: null };
  } catch (error) {
    return { coupons: [], error: error as Error };
  }
}
