import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import CatalogoPage from '@/app/catalogo/page';
import CheckoutPage from '@/app/checkout/page';
import { clearCatalogReturn, readCatalogReturn, saveCatalogReturn } from '@/lib/catalog/browsingState';
import { saveCheckoutDraft } from '@/lib/auth/checkoutDraft';
import type { Wine } from '@/types/database';

const fixture = vi.hoisted(() => ({
  cart: [] as Array<Wine & { quantity: number }>,
  wines: [] as Wine[],
  createOrder: vi.fn(),
  quote: vi.fn(),
  promotion: vi.fn(),
  user: null as null | { id: string; name: string; phone: string; birthDate: string },
}));

vi.mock('@/hooks/useWines', () => ({ useWines: () => ({ wines: fixture.wines, isLoading: false, isOffline: false }) }));
vi.mock('@/context/CartContext', () => ({
  useCart: () => ({ cart: fixture.cart, cartTotal: fixture.cart.length * 99, addToCart: vi.fn(), clearCart: vi.fn() }),
}));
vi.mock('@/context/FavoritesContext', () => ({ useFavorites: () => ({ isFavorite: () => false, toggleFavorite: vi.fn() }) }));
vi.mock('@/context/RecentlyViewedContext', () => ({ useRecentlyViewed: () => ({ recentlyViewed: [] }) }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('@/lib/auth/currentUser', () => ({ getCurrentUserFast: async () => fixture.user }));
vi.mock('@/lib/database/orders', () => ({ createOrder: fixture.createOrder, getUserOrders: vi.fn() }));
vi.mock('@/lib/database/promotions', () => ({
  calculatePromotionDiscount: () => 10,
  fetchActivePromotionByCode: fixture.promotion,
  getPromotionBottleCount: () => 1,
  getPromotionEligibleSubtotal: () => 99,
  normalizePromotionCode: (code: string) => code.toUpperCase(),
}));
vi.mock('@/lib/database/delivery', () => ({ fetchDeliveryQuote: fixture.quote }));
vi.mock('@/lib/database/payments', () => ({ createPaymentCheckout: vi.fn() }));
vi.mock('@/components/ui', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/components/ui')>(),
  PageTransition: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const wine: Wine = {
  id: 'wine-1', name: 'Malbec de teste', description: null, price: 99, original_price: 99,
  discount_percent: null, promotion_id: null, promotion_title: null, promotion_slug: null,
  image_url: null, type: 'Tinto', region: 'Mendoza', grape: 'Malbec', category: 'Argentina',
  stock: 10, product_code: null, published: true, created_at: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  fixture.cart = [];
  sessionStorage.clear();
  fixture.quote.mockReset();
  fixture.promotion.mockReset();
  fixture.user = null;
  fixture.createOrder.mockClear();
  fixture.wines = Array.from({ length: 18 }, (_, index) => ({ ...wine, id: `wine-${index + 1}`, name: `Malbec ${index + 1}` }));
  clearCatalogReturn();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('UX de compra', () => {
  it('retoma endereço e revalida frete e cupom depois da autenticação', async () => {
    fixture.cart = [{ ...wine, quantity: 1 }];
    fixture.user = { id: 'user-1', name: 'Cliente', phone: '27999999999', birthDate: '' };
    fixture.quote.mockResolvedValue({ zone: { name: 'Região', estimate_days: 2, fee: 10 }, shippingFee: 10, error: null });
    fixture.promotion.mockResolvedValue({ promotion: { code: 'VINHO', title: 'Desconto', min_subtotal: 0, scope: 'all' }, error: null });
    saveCheckoutDraft(sessionStorage, { savedAt: Date.now(), entrega: 'entrega', address: { logradouro: 'Rua Um', numero: '10', bairro: 'Centro', localidade: 'Vitória', uf: 'ES' }, cep: '29000-000', pagamento: 'Pix', installments: 1, promotionCode: 'VINHO', promotionApplied: true });
    window.history.replaceState(null, '', '/checkout');
    render(<CheckoutPage />);
    expect(await screen.findByDisplayValue('Rua Um')).toBeVisible();
    expect(screen.getByDisplayValue('10')).toBeVisible();
    await waitFor(() => expect(fixture.quote).toHaveBeenCalledWith('29000000', 99));
    await waitFor(() => expect(fixture.promotion).toHaveBeenCalledWith('VINHO'));
    expect(await screen.findByText('Desconto aplicado.')).toBeVisible();
  });
  it('solicita WhatsApp ausente antes de criar o pedido e salva o contato', async () => {
    fixture.cart = [{ ...wine, quantity: 1 }];
    fixture.user = { id: 'user-1', name: 'Cliente', phone: '', birthDate: '' };
    fixture.createOrder.mockResolvedValue({ order: null, error: new Error('Teste') });
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ phone: '27992770952' }) }));
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/checkout');
    render(<CheckoutPage />);
    const input = await screen.findByLabelText('WhatsApp');
    fireEvent.click(screen.getByRole('radio', { name: /Retirada na Loja/ }));
    fireEvent.click(screen.getByRole('button', { name: /IR PARA PAGAMENTO/ }));
    expect(screen.getByText(/Informe um WhatsApp válido com DDD para finalizar/)).toBeVisible();
    expect(fixture.createOrder).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '27992770952' } });
    fireEvent.click(screen.getByRole('button', { name: /IR PARA PAGAMENTO/ }));
    await waitFor(() => expect(fixture.createOrder).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith('/api/cliente/whatsapp', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ whatsapp: '27992770952' }) }));
  });
  it('renderiza oito produtos e acrescenta outro lote sob demanda', async () => {
    window.history.replaceState(null, '', '/catalogo');
    await act(async () => { render(<CatalogoPage />); });
    expect(screen.getAllByRole('article')).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: 'Ver mais produtos em Todos os produtos' }));
    expect(screen.getAllByRole('article')).toHaveLength(16);
    expect(await screen.findByText('18 produtos encontrados')).toBeVisible();
  });

  it('retoma busca, ordenação, filtro e a quantidade de produtos exibida', async () => {
    window.history.replaceState(null, '', '/catalogo');
    saveCatalogReturn({
      href: '/catalogo', productId: 'wine-12', search: 'Malbec', sortBy: 'price-asc',
      price: null, type: 'Tinto', grape: '', country: '', region: '', top: 630,
      limits: { 'todos-os-produtos': 16 },
    });
    await act(async () => { render(<CatalogoPage />); });
    expect(screen.getByPlaceholderText('Buscar por nome, uva ou região')).toHaveValue('Malbec');
    expect(screen.getByRole('combobox', { name: 'Ordenar produtos' })).toHaveValue('price-asc');
    expect(screen.getByRole('button', { name: 'Remover filtro de tipo' })).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(16);
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith({ top: 630, behavior: 'instant' }));
    expect(readCatalogReturn()).toBeNull();
  });

  it('informa frete pendente, atualiza o resumo para retirada e mantém o cupom recolhido', async () => {
    fixture.cart = [{ ...wine, quantity: 1 }];
    window.history.replaceState(null, '', '/checkout');
    render(<CheckoutPage />);
    expect(screen.getByText('Total estimado')).toBeVisible();
    expect(screen.getByText('A calcular')).toBeVisible();
    expect(screen.getByLabelText('CEP para calcular frete')).toBeVisible();
    expect(screen.getByText('Tenho um cupom').closest('details')).not.toHaveAttribute('open');
    fireEvent.click(screen.getByRole('radio', { name: /Retirada na Loja/ }));
    expect(screen.getByText('Total', { exact: true })).toBeVisible();
    expect(screen.queryByText('Total estimado')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('CEP para calcular frete')).not.toBeInTheDocument();
    expect(fixture.createOrder).not.toHaveBeenCalled();
  });

  it('preserva o cupom recebido por link e oferece voltar quando o carrinho está vazio', async () => {
    fixture.cart = [{ ...wine, quantity: 1 }];
    window.history.replaceState(null, '', '/checkout?cupom=teste');
    const { rerender } = render(<CheckoutPage />);
    expect(await screen.findByDisplayValue('TESTE')).toBeVisible();
    fixture.cart = [];
    rerender(<CheckoutPage />);
    expect(screen.getByRole('link', { name: 'Voltar ao catálogo' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /IR PARA PAGAMENTO/ })).not.toBeInTheDocument();
  });
});
