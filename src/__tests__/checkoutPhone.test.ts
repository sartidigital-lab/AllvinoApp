import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCheckoutPhone, normalizeCheckoutPhone } from '@/lib/auth/checkoutPhone';

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn(), rpc: vi.fn() }));
vi.mock('@/utils/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser, updateUser: mocks.updateUser }, rpc: mocks.rpc }) }));
vi.mock('@/lib/security/rateLimit', () => ({ checkRateLimitDistributed: async () => ({ allowed: true }), getClientKey: () => 'test', rateLimitResponse: vi.fn() }));
vi.mock('@/lib/push/subscription', () => ({ isSameOrigin: () => true }));
import { PATCH } from '@/app/api/cliente/whatsapp/route';
import { POST } from '@/app/api/pedidos/route';

describe('checkout contact', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('validates local and country-code numbers and falls back to the phone metadata', () => {
    expect(normalizeCheckoutPhone('(27) 99277-0952')).toBe('27992770952');
    expect(normalizeCheckoutPhone('+55 (27) 99277-0952')).toBe('27992770952');
    expect(normalizeCheckoutPhone('123')).toBe('');
    expect(getCheckoutPhone({ whatsapp: 'inválido', telefone: '2733334444' })).toBe('2733334444');
    expect(getCheckoutPhone({})).toBe('');
  });

  it('requires an authenticated user to update the contact', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await PATCH(new Request('https://example.com/api/cliente/whatsapp', { method: 'PATCH', body: JSON.stringify({ whatsapp: '27992770952' }) }));
    expect(result.status).toBe(401);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('rejects invalid contacts and stores a valid number in the profile', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user' } }, error: null });
    mocks.updateUser.mockResolvedValue({ error: null });
    const request = (whatsapp: string) => new Request('https://example.com/api/cliente/whatsapp', { method: 'PATCH', body: JSON.stringify({ whatsapp }) });
    expect((await PATCH(request('123'))).status).toBe(400);
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect((await PATCH(request('(27) 99277-0952'))).status).toBe(200);
    expect(mocks.updateUser).toHaveBeenCalledWith({ data: { whatsapp: '27992770952' } });
  });

  it('blocks order creation before reserving stock when contact is missing', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user', user_metadata: {} } }, error: null });
    const result = await POST(new Request('https://example.com/api/pedidos', { method: 'POST', body: '{}' }));
    expect(result.status).toBe(400);
    expect((await result.json()).error).toContain('WhatsApp');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('passes the validated contact to the stock reservation for authenticated customers', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user', user_metadata: { whatsapp: '+55 (27) 99277-0952' } } }, error: null });
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Estoque insuficiente para concluir o pedido.' } });
    const result = await POST(new Request('https://example.com/api/pedidos', { method: 'POST', body: JSON.stringify({ cartItems: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Vinho', quantity: 1 }], deliveryMethod: 'Retirada na Loja', paymentMethod: 'Pix' }) }));
    expect(result.status).toBe(409);
    expect(mocks.rpc).toHaveBeenCalledWith('create_order_with_stock_reservation', expect.objectContaining({ p_customer_phone: '27992770952' }));
  });
});
