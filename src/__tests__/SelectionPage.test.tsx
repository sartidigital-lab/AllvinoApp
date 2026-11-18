import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SelectionPage from '@/app/selecao/[id]/page';
import type { Wine } from '@/types/database';

const fixture = vi.hoisted(() => ({ cart: [] as Array<Wine & { quantity: number }>, add: vi.fn(), open: vi.fn(), toast: vi.fn() }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'selection-1' }) }));
vi.mock('@/hooks/useWines', () => ({ useWines: () => ({ wines: [wine], isLoading: false, error: null }) }));
vi.mock('@/context/CartContext', () => ({ useCart: () => ({ cart: fixture.cart, addToCart: fixture.add, setIsCartOpen: fixture.open }) }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ showToast: fixture.toast }) }));
vi.mock('@/components/ui', () => ({ ProductImage: ({ alt }: { alt: string }) => <div aria-label={alt} /> }));

const wine: Wine = { id: 'e4c70c3a-2737-4df5-9550-4e1f7fe97ee7', name: 'Kit de teste', product_kind: 'kit', kit_item_count: 4, description: null, price: 99, original_price: 120, discount_percent: 17, promotion_id: null, promotion_title: null, promotion_slug: null, image_url: null, type: null, region: null, grape: null, category: null, stock: 2, product_code: null, published: true, created_at: '2026-01-01T00:00:00.000Z' };

beforeEach(() => {
  fixture.cart = [];
  fixture.add.mockClear(); fixture.open.mockClear(); fixture.toast.mockClear();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [{ id: 'selection-1', title: 'Seleção de kits', description: '', image_url: '/desktop.jpg', mobile_image_url: '/mobile.jpg', product_ids: [wine.id] }] })));
});
afterEach(() => vi.unstubAllGlobals());

describe('página de seleção', () => {
  it('exibe valores totais e por garrafa no preço normal e no PIX', async () => {
    render(<SelectionPage />);
    expect(await screen.findByText(/24,75 por garrafa/)).toBeVisible();
    expect(screen.getByText(/23,51 por garrafa/)).toBeVisible();
    expect(screen.getByText(/94,05/)).toBeVisible();
    expect(screen.getByText(/33,00.*sem juros/)).toBeVisible();
  });

  it('adiciona produto e informa o cliente, com imagens por dispositivo', async () => {
    render(<SelectionPage />);
    const button = await screen.findByRole('button', { name: 'Adicionar ao carrinho' });
    fireEvent.click(button);
    expect(fixture.add).toHaveBeenCalledWith(wine);
    expect(fixture.toast).toHaveBeenCalledWith('Kit de teste adicionado ao carrinho!', 'success');
    const source = document.querySelector('picture source');
    expect(source).toHaveAttribute('media', '(max-width: 639px)');
    expect(source).toHaveAttribute('srcset', '/mobile.jpg');
  });

  it('impede adição além do estoque e oferece acesso ao carrinho', async () => {
    fixture.cart = [{ ...wine, quantity: 2 }];
    render(<SelectionPage />);
    expect(await screen.findByRole('button', { name: 'Limite no carrinho' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ver carrinho (2)' }));
    expect(fixture.open).toHaveBeenCalledWith(true);
    expect(fixture.add).not.toHaveBeenCalled();
  });

  it('mostra erro de conexão sem confundir com seleção inexistente', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    render(<SelectionPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a seleção');
  });
});
