import { beforeEach, describe, expect, it, vi } from 'vitest';
import { safeInternalRedirect } from '@/lib/auth/safeRedirect';
import { saveCheckoutDraft, takeCheckoutDraft } from '@/lib/auth/checkoutDraft';

const mocks = vi.hoisted(() => ({ signInWithPassword: vi.fn(), signUp: vi.fn(), signInWithOAuth: vi.fn(), resetPasswordForEmail: vi.fn(), exchangeCodeForSession: vi.fn() }));
vi.mock('@/utils/supabase/bff-server', () => ({ createBffAuthClient: async () => ({ auth: mocks }) }));
vi.mock('@/lib/push/subscription', () => ({ isSameOrigin: () => true }));
import { POST } from '@/app/api/auth/[action]/route';
import { GET } from '@/app/auth/callback/route';

const request = (action: string, body: unknown) => new Request(`https://allvino.example/api/auth/${action}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const context = (action: string) => ({ params: Promise.resolve({ action }) });

describe('retorno seguro após autenticação', () => {
  beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });

  it('permite catálogo, cupons, produto, seleção e telas existentes do admin, preservando parâmetros', () => {
    for (const route of ['/catalogo', '/cupons', '/favoritos', '/catalogo/item-123?origem=teste', '/selecao/abc-123', '/admin/pedidos', '/checkout?cupom=ABC']) {
      expect(safeInternalRedirect(route)).toBe(route);
    }
    for (const route of ['https://evil.example', '//evil.example', '/\\evil.example', '/%2f%2fevil.example', '/admin/users', '/catalogo/../admin', '/catalogo/item/extra']) {
      expect(safeInternalRedirect(route)).toBe('/');
    }
  });

  it('autentica por senha sem alterar o destino solicitado pelo cliente', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: '1', email: 'test@example.com', user_metadata: {} } }, error: null });
    const response = await POST(request('login', { email: 'test@example.com', password: 'Senha123!' }), context('login'));
    expect(response.status).toBe(200);
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'test@example.com', password: 'Senha123!' });
  });

  it('preserva o checkout com cupom no link de confirmação de cadastro', async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id: '1', email: 'test@example.com', user_metadata: {} }, session: null }, error: null });
    const body = { email: 'test@example.com', password: 'Senha123!', name: 'Cliente Teste', cpf: '52998224725', phone: '27999999999', whatsapp: '27999999999', whatsappSamePhone: true, redirectTo: '/checkout?cupom=VINHO' };
    expect((await POST(request('signup', body), context('signup'))).status).toBe(200);
    const options = mocks.signUp.mock.calls[0][0].options;
    expect(new URL(options.emailRedirectTo).searchParams.get('next')).toBe('/checkout?cupom=VINHO');
  });

  it('preserva o produto no retorno do Google e rejeita retorno externo', async () => {
    mocks.signInWithOAuth.mockResolvedValue({ data: { url: 'https://provider.example' }, error: null });
    await POST(request('oauth', { redirectTo: '/catalogo/item-123?origem=abc' }), context('oauth'));
    expect(new URL(mocks.signInWithOAuth.mock.calls[0][0].options.redirectTo).searchParams.get('next')).toBe('/catalogo/item-123?origem=abc');
    await POST(request('oauth', { redirectTo: '//evil.example' }), context('oauth'));
    expect(new URL(mocks.signInWithOAuth.mock.calls[1][0].options.redirectTo).searchParams.get('next')).toBe('/');
  });

  it('retorna à recuperação de senha e troca o código antes de seguir ao destino', async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({});
    await POST(request('recover', { email: 'test@example.com' }), context('recover'));
    expect(new URL(mocks.resetPasswordForEmail.mock.calls[0][1].redirectTo).searchParams.get('next')).toBe('/recuperar-senha');
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await GET(new Request('https://allvino.example/auth/callback?code=abc&next=%2Fcupons'));
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('abc');
    expect(response.headers.get('location')).toBe('https://allvino.example/cupons');
  });

  it('recupera apenas rascunhos recentes e válidos de checkout na mesma sessão', () => {
    const draft = { savedAt: 10000, entrega: 'retirada' as const, address: { logradouro: 'Rua', numero: '1', bairro: '', localidade: '', uf: '' }, cep: '', pagamento: 'Pix' as const, installments: 1, promotionCode: 'VINHO', promotionApplied: true };
    saveCheckoutDraft(sessionStorage, draft);
    expect(takeCheckoutDraft(sessionStorage, 11000)).toEqual(draft);
    expect(takeCheckoutDraft(sessionStorage, 11000)).toBeNull();
    saveCheckoutDraft(sessionStorage, draft);
    expect(takeCheckoutDraft(sessionStorage, 3601001 + 10000)).toBeNull();
  });
});
