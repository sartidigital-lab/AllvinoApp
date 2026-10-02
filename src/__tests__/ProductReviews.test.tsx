import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductReviews } from '@/components/catalog/ProductReviews';

const productId = '1b5d2a72-4675-4f2b-9260-6a5dcaf3d4f4';

function reviewPayload(overrides: Partial<object> = {}) {
  return {
    reviews: [{
      id: 'review-1',
      rating: 5,
      comment: 'Excelente escolha para o jantar.',
      created_at: '2026-10-02T00:00:00.000Z',
      updated_at: '2026-10-02T00:00:00.000Z',
    }],
    summary: { reviewCount: 1, averageRating: 5 },
    viewer: { isAuthenticated: false, canReview: false, review: null },
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProductReviews', () => {
  it('shows published verified reviews and asks signed-out visitors to log in', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(reviewPayload()), { status: 200 })));

    render(<ProductReviews productId={productId} />);

    expect(await screen.findByText('Cliente verificado')).toBeVisible();
    expect(screen.getByText('Excelente escolha para o jantar.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Entre na sua conta' })).toHaveAttribute(
      'href', `/?login=true&redirectTo=${encodeURIComponent(`/catalogo/${productId}`)}`,
    );
  });

  it('submits an evaluation only after the API confirms the purchase', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(reviewPayload({
        reviews: [],
        summary: { reviewCount: 0, averageRating: 0 },
        viewer: { isAuthenticated: true, canReview: true, review: null },
      })), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ review: { id: 'review-2', rating: 4, comment: null } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(reviewPayload({
        reviews: [],
        summary: { reviewCount: 1, averageRating: 4 },
        viewer: { isAuthenticated: true, canReview: true, review: { rating: 4, comment: null } },
      })), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<ProductReviews productId={productId} />);

    await screen.findByRole('button', { name: '4 estrelas' });
    await user.click(screen.getByRole('button', { name: '4 estrelas' }));
    await user.click(screen.getByRole('button', { name: 'Publicar avaliação' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1][0]).toBe(`/api/catalogo/${productId}/avaliacoes`);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ rating: 4, comment: '' });
    expect(await screen.findByText('Sua avaliação foi salva.')).toBeVisible();
  });
});
