"use client";

import { createClient } from '@/utils/supabase/client';
import { useEffect, useMemo, useState } from 'react';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled';

type AdminOrderItem = {
  quantity: number;
  unit_price: number;
  product_name: string | null;
  wines: { name: string } | { name: string }[] | null;
};

type AdminOrder = {
  id: string;
  status: OrderStatus;
  total_amount: number;
  delivery_type: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  order_items: AdminOrderItem[] | null;
};

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Em separacao',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusFlow: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'delivered'];

function getItemName(item: AdminOrderItem) {
  if (item.product_name) return item.product_name;
  if (Array.isArray(item.wines)) return item.wines[0]?.name || 'Produto removido';
  return item.wines?.name || 'Produto removido';
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function nextStatus(status: OrderStatus) {
  const currentIndex = statusFlow.indexOf(status);
  if (currentIndex === -1 || currentIndex === statusFlow.length - 1) return null;
  return statusFlow[currentIndex + 1];
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'all' | OrderStatus>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('id,status,total_amount,delivery_type,created_at,customer_name,customer_phone,order_items(quantity,unit_price,product_name,wines(name))')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      setErrorMessage('Nao foi possivel carregar os pedidos.');
      setIsLoading(false);
      return;
    }

    const nextOrders = (data || []) as AdminOrder[];
    setOrders(nextOrders);
    setSelectedOrderId((current) => current || nextOrders[0]?.id || null);
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (selectedStatus === 'all') return orders;
    return orders.filter((order) => order.status === selectedStatus);
  }, [orders, selectedStatus]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || filteredOrders[0] || null,
    [filteredOrders, orders, selectedOrderId]
  );

  const summary = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.total += 1;
        acc.revenue += order.total_amount;
        acc[order.status] += 1;
        return acc;
      },
      { total: 0, revenue: 0, pending: 0, confirmed: 0, preparing: 0, delivered: 0, cancelled: 0 }
    );
  }, [orders]);

  const updateOrderStatus = async (order: AdminOrder, status: OrderStatus) => {
    setUpdatingId(order.id);
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', order.id);

    if (error) {
      setErrorMessage('Nao foi possivel atualizar o status do pedido.');
      setUpdatingId(null);
      return;
    }

    setOrders((current) =>
      current.map((item) => (item.id === order.id ? { ...item, status } : item))
    );
    setUpdatingId(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif text-black">Pedidos</h1>
          <p className="mt-1 text-sm font-bold text-stone-500">Acompanhe, filtre e avance pedidos em operacao.</p>
        </div>
        <button
          type="button"
          onClick={loadOrders}
          className="flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white transition hover:bg-stone-800"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Atualizar
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-lg bg-black p-5 text-white shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Total</p>
          <p className="mt-2 text-3xl font-bold">{isLoading ? '...' : summary.total}</p>
        </div>
        <div className="rounded-lg border border-stone-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Pendente</p>
          <p className="mt-2 text-3xl font-bold text-black">{isLoading ? '...' : summary.pending}</p>
        </div>
        <div className="rounded-lg border border-stone-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Preparando</p>
          <p className="mt-2 text-3xl font-bold text-black">{isLoading ? '...' : summary.preparing}</p>
        </div>
        <div className="rounded-lg border border-stone-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Entregues</p>
          <p className="mt-2 text-3xl font-bold text-black">{isLoading ? '...' : summary.delivered}</p>
        </div>
        <div className="rounded-lg border border-stone-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Faturamento</p>
          <p className="mt-2 text-xl font-bold text-black">{isLoading ? '...' : formatMoney(summary.revenue)}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', ...statusFlow, 'cancelled'] as Array<'all' | OrderStatus>).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setSelectedStatus(status)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
              selectedStatus === status ? 'bg-black text-white' : 'bg-white text-stone-500 border border-stone-200'
            }`}
          >
            {status === 'all' ? 'Todos' : statusLabels[status]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-lg border border-stone-100 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="font-bold text-black">Fila de pedidos</h2>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-sm font-bold text-stone-400">Carregando pedidos...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-sm font-bold text-stone-400">Nenhum pedido neste filtro.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filteredOrders.map((order) => {
                const itemCount = order.order_items?.reduce((total, item) => total + item.quantity, 0) || 0;
                const isSelected = selectedOrder?.id === order.id;

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`grid w-full grid-cols-1 gap-3 p-5 text-left transition md:grid-cols-[1.2fr_1fr_auto] md:items-center ${
                      isSelected ? 'bg-stone-50' : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-black">Pedido #{order.id.slice(0, 8)}</p>
                      <p className="mt-1 text-xs font-bold text-stone-400">
                        {new Date(order.created_at).toLocaleString('pt-BR')} • {itemCount} itens
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-black">{order.customer_name || 'Cliente sem nome'}</p>
                      <p className="truncate text-xs font-bold text-stone-400">{order.customer_phone || order.delivery_type}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${statusStyles[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                      <span className="text-sm font-bold text-black">{formatMoney(order.total_amount)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="rounded-lg border border-stone-100 bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:self-start">
          {!selectedOrder ? (
            <div className="py-10 text-center text-sm font-bold text-stone-400">Selecione um pedido.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Pedido</p>
                  <h2 className="mt-1 text-xl font-bold text-black">#{selectedOrder.id.slice(0, 8)}</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${statusStyles[selectedOrder.status]}`}>
                  {statusLabels[selectedOrder.status]}
                </span>
              </div>

              <div className="space-y-2 rounded-lg bg-stone-50 p-4">
                <p className="font-bold text-black">{selectedOrder.customer_name || 'Cliente sem nome'}</p>
                <p className="text-sm font-bold text-stone-500">{selectedOrder.customer_phone || 'Telefone nao informado'}</p>
                <p className="text-xs font-bold text-stone-400">{selectedOrder.delivery_type}</p>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-400">Itens</h3>
                <div className="space-y-3">
                  {selectedOrder.order_items?.map((item, index) => (
                    <div key={`${selectedOrder.id}-${index}`} className="flex justify-between gap-3 rounded-lg border border-stone-100 p-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-bold text-black">{getItemName(item)}</p>
                        <p className="text-xs font-bold text-stone-400">{item.quantity} x {formatMoney(item.unit_price)}</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-black">{formatMoney(item.quantity * item.unit_price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-stone-100 pt-4">
                <div className="flex items-center justify-between text-lg font-bold text-black">
                  <span>Total</span>
                  <span>{formatMoney(selectedOrder.total_amount)}</span>
                </div>
              </div>

              <div className="space-y-3">
                {nextStatus(selectedOrder.status) && (
                  <button
                    type="button"
                    disabled={updatingId === selectedOrder.id}
                    onClick={() => updateOrderStatus(selectedOrder, nextStatus(selectedOrder.status)!)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#B91C1C] py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    Avancar para {statusLabels[nextStatus(selectedOrder.status)!]}
                  </button>
                )}
                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                  <button
                    type="button"
                    disabled={updatingId === selectedOrder.id}
                    onClick={() => updateOrderStatus(selectedOrder, 'cancelled')}
                    className="w-full rounded-xl border border-red-100 bg-red-50 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    Cancelar pedido
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
