import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AdminOrderFilters } from '@/components/admin/AdminOrderFilters';
import { getAdminOrderTotals, matchesAdminOrderPeriod, matchesAdminOrderStatus } from '@/lib/orders/adminFilters';

const order = { status: 'preparing', payment_status: 'paid', created_at: new Date(2026, 10, 21, 23, 59, 59).toISOString(), total_amount: 100 };

describe('filtros administrativos de pedidos', () => {
  it('inclui os dias inicial e final e respeita intervalos abertos', () => {
    expect(matchesAdminOrderPeriod(order, { start: '2026-11-21', end: '2026-11-21' })).toBe(true);
    expect(matchesAdminOrderPeriod(order, { start: '2026-11-22', end: '' })).toBe(false);
    expect(matchesAdminOrderPeriod(order, { start: '', end: '2026-11-20' })).toBe(false);
    expect(matchesAdminOrderPeriod(order, { start: '', end: '' })).toBe(true);
    expect(matchesAdminOrderPeriod(order, { start: '2026-11-22', end: '2026-11-20' })).toBe(false);
  });

  it('distingue situação operacional e pagamento confirmado', () => {
    expect(matchesAdminOrderStatus(order, 'paid')).toBe(true);
    expect(matchesAdminOrderStatus(order, 'preparing')).toBe(true);
    expect(matchesAdminOrderStatus({ ...order, status: 'confirmed', payment_status: 'pending' }, 'paid')).toBe(false);
    expect(matchesAdminOrderStatus({ ...order, status: 'confirmed', payment_status: 'pending' }, 'confirmed')).toBe(true);
  });

  it('separa valor dos pedidos do valor pago e exclui cancelados do pago', () => {
    expect(getAdminOrderTotals([order, { ...order, status: 'pending', payment_status: 'pending', total_amount: 30 }, { ...order, status: 'cancelled', total_amount: 20 }])).toEqual({ count: 3, value: 150, paid: 100 });
  });

  it('permite definir datas e selecionar e limpar situação', () => {
    const onPeriodChange = vi.fn();
    const onStatusChange = vi.fn();
    const { rerender } = render(<AdminOrderFilters period={{ start: '', end: '' }} onPeriodChange={onPeriodChange} status="all" onStatusChange={onStatusChange} />);
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-11-01' } });
    expect(onPeriodChange).toHaveBeenCalledWith({ start: '2026-11-01', end: '' });
    fireEvent.click(screen.getByRole('button', { name: 'Pagamento confirmado' }));
    expect(onStatusChange).toHaveBeenCalledWith('paid');
    rerender(<AdminOrderFilters period={{ start: '2026-11-01', end: '' }} onPeriodChange={onPeriodChange} status="paid" onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(onPeriodChange).toHaveBeenLastCalledWith({ start: '', end: '' });
    expect(onStatusChange).toHaveBeenLastCalledWith('all');
  });
});
