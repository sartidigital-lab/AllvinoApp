import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminAnalyticsPage from '@/app/admin/page';
import AdminPedidosPage from '@/app/admin/pedidos/page';

const fixtures = vi.hoisted(() => ({
  orders: [
    { id: 'paid-order', status: 'preparing', payment_status: 'paid', payment_provider: 'pagarme', total_amount: 100, created_at: '2026-11-15T15:00:00Z', delivery_type: 'Retirada', order_items: [] },
    { id: 'pending-order', status: 'pending', payment_status: 'pending', payment_provider: 'pagarme', total_amount: 30, created_at: '2026-11-20T15:00:00Z', delivery_type: 'Retirada', order_items: [] },
  ],
}));

vi.mock('@/utils/supabase/admin-client', () => ({ createClient: () => ({
  from: (table: string) => {
    const data = table === 'orders' ? fixtures.orders : [];
    const query = {
      select: () => query, order: () => query,
      range: async (start: number, end: number) => ({ data: data.slice(start, end + 1), error: null }),
      limit: async () => ({ data, error: null }),
    };
    return query;
  },
}) }));
vi.mock('@/lib/database/stock', () => ({ fetchStockLevels: async () => ({ stockLevels: [], error: null }) }));

afterEach(cleanup);

describe.each([['Visão Geral', AdminAnalyticsPage], ['Pedidos', AdminPedidosPage]])('filtros em %s', (_name, Page) => {
  it('atualiza contagem e valores por período e situação', async () => {
    render(<Page />);
    await waitFor(() => expect(screen.getByText(/130,00/)).toBeInTheDocument());
    const filters = screen.getByRole('region', { name: 'Filtros de pedidos' });
    fireEvent.click(within(filters).getByRole('button', { name: /Pagamento confirmado/ }));
    await waitFor(() => expect(screen.queryByText(/130,00/)).not.toBeInTheDocument());
    expect(screen.getAllByText(/100,00/).length).toBeGreaterThan(0);
    fireEvent.change(within(filters).getByLabelText('De'), { target: { value: '2026-11-18' } });
    await waitFor(() => expect(screen.queryAllByText(/100,00/)).toHaveLength(0));
    fireEvent.click(within(filters).getByRole('button', { name: 'Limpar filtros' }));
    await waitFor(() => expect(screen.getByText(/130,00/)).toBeInTheDocument());
  });
});

it('carrega todos os pedidos além da primeira página', async () => {
  fixtures.orders.push(...Array.from({ length: 251 }, (_, index) => ({ ...fixtures.orders[0], id: `extra-${index}` })));
  try {
    render(<AdminPedidosPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Todos (253)' })).toBeInTheDocument());
  } finally {
    fixtures.orders.splice(2);
  }
});
