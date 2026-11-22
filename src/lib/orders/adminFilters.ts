export type AdminOrderStatusFilter = 'all' | 'pending' | 'confirmed' | 'paid' | 'preparing' | 'delivered' | 'cancelled';
export type AdminOrderPeriod = { start: string; end: string };
export type FilterableOrder = { status: string; payment_status: string; created_at: string; total_amount: number };

export const adminStatusFilters: { value: AdminOrderStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pagamento confirmado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'Em separação' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
];

// Dates are calendar dates in the administrator's local timezone, inclusive.
export function matchesAdminOrderPeriod(order: FilterableOrder, period: AdminOrderPeriod): boolean {
  const timestamp = new Date(order.created_at).getTime();
  if (!Number.isFinite(timestamp)) return false;
  const start = period.start ? new Date(`${period.start}T00:00:00`).getTime() : -Infinity;
  const end = period.end ? new Date(`${period.end}T23:59:59.999`).getTime() : Infinity;
  return timestamp >= start && timestamp <= end;
}

export function matchesAdminOrderStatus(order: FilterableOrder, status: AdminOrderStatusFilter): boolean {
  if (status === 'all') return true;
  if (status === 'paid') return order.payment_status === 'paid';
  return order.status === status;
}

export function getAdminOrderTotals(orders: FilterableOrder[]) {
  return orders.reduce((totals, order) => {
    totals.count += 1;
    totals.value += Number(order.total_amount) || 0;
    if (order.payment_status === 'paid' && order.status !== 'cancelled') totals.paid += Number(order.total_amount) || 0;
    return totals;
  }, { count: 0, value: 0, paid: 0 });
}

export function getAdminStatusCounts(orders: FilterableOrder[]): Record<AdminOrderStatusFilter, number> {
  return Object.fromEntries(adminStatusFilters.map(({ value }) => [value, orders.filter((order) => matchesAdminOrderStatus(order, value)).length])) as Record<AdminOrderStatusFilter, number>;
}
