import { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from '@/context/CartContext';
import { Wine } from '@/types/database';

vi.mock('@/lib/database/wines', () => ({
  fetchWinesFromSupabase: vi.fn(async () => []),
}));

const wine: Wine = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Vinho de teste',
  description: null,
  price: 99,
  original_price: 99,
  discount_percent: null,
  promotion_id: null,
  promotion_title: null,
  promotion_slug: null,
  image_url: null,
  type: 'Tinto',
  region: 'Mendoza',
  grape: 'Malbec',
  category: 'Argentina',
  stock: 10,
  product_code: null,
  published: true,
  created_at: '2026-01-01T00:00:00.000Z',
};

function CartHarness() {
  const { addToCart, addManyToCart, cart, isCartOpen } = useCart();

  return (
    <>
      <button type="button" onClick={() => addToCart(wine)}>Adicionar produto</button>
      <button type="button" onClick={() => addManyToCart([{ ...wine, quantity: 2 }])}>Adicionar vários</button>
      <output data-testid="cart-open">{String(isCartOpen)}</output>
      <output data-testid="cart-quantity">{cart[0]?.quantity ?? 0}</output>
    </>
  );
}

function renderCart(children: ReactNode = <CartHarness />) {
  localStorage.clear();
  return render(<CartProvider>{children}</CartProvider>);
}

describe('CartContext', () => {
  it('adiciona um produto sem abrir o carrinho automaticamente', () => {
    renderCart();

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar produto' }));

    expect(screen.getByTestId('cart-quantity')).toHaveTextContent('1');
    expect(screen.getByTestId('cart-open')).toHaveTextContent('false');
  });

  it('adiciona vários produtos sem interromper a navegação atual', () => {
    renderCart();

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar vários' }));

    expect(screen.getByTestId('cart-quantity')).toHaveTextContent('2');
    expect(screen.getByTestId('cart-open')).toHaveTextContent('false');
  });
});
