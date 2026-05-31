"use client";

import { createClient } from '@/utils/supabase/client';
import { useEffect, useMemo, useState } from 'react';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled';
type DateFilter = 'all' | 'today' | '7d' | '30d';
type SortOrder = 'recent' | 'oldest' | 'value-desc' | 'value-asc';

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
  payment_method: string | null;
  delivery_address: string | null;
  discount_amount: number;
  subtotal_amount: number | null;
  promotion_code: string | null;
  delivery_zip_code: string | null;
  delivery_zone_name: string | null;
  delivery_estimate_days: number | null;
  shipping_fee: number;
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
const statusOptions: Array<'all' | OrderStatus> = ['all', ...statusFlow, 'cancelled'];

const dateFilterLabels: Record<DateFilter, string> = {
  all: 'Todo periodo',
  today: 'Hoje',
  '7d': 'Ultimos 7 dias',
  '30d': 'Ultimos 30 dias',
};

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

function normalizeSearch(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getDateLimit(filter: DateFilter) {
  if (filter === 'all') return null;

  const date = new Date();
  date.setHours(0, 0, 0, 0);

  if (filter === '7d') {
    date.setDate(date.getDate() - 6);
  }

  if (filter === '30d') {
    date.setDate(date.getDate() - 29);
  }

  return date.getTime();
}

function getWhatsAppUrl(phone: string | null) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;

  const normalizedPhone = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${normalizedPhone}`;
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'all' | OrderStatus>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('id,status,total_amount,delivery_type,payment_method,delivery_address,discount_amount,subtotal_amount,promotion_code,delivery_zip_code,delivery_zone_name,delivery_estimate_days,shipping_fee,created_at,customer_name,customer_phone,order_items(quantity,unit_price,product_name,wines(name))')
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
    const normalizedSearch = normalizeSearch(searchTerm.trim());
    const dateLimit = getDateLimit(dateFilter);

    return orders
      .filter((order) => {
        const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
        const matchesDate = !dateLimit || new Date(order.created_at).getTime() >= dateLimit;
        const itemNames = order.order_items?.map(getItemName).join(' ') || '';
        const searchableText = normalizeSearch(
          [
            order.id,
            order.customer_name,
            order.customer_phone,
            order.delivery_type,
            order.payment_method,
            order.delivery_address,
            itemNames,
          ].join(' ')
        );
        const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);

        return matchesStatus && matchesDate && matchesSearch;
      })
      .sort((firstOrder, secondOrder) => {
        if (sortOrder === 'oldest') {
          return new Date(firstOrder.created_at).getTime() - new Date(secondOrder.created_at).getTime();
        }

        if (sortOrder === 'value-desc') {
          return secondOrder.total_amount - firstOrder.total_amount;
        }

        if (sortOrder === 'value-asc') {
          return firstOrder.total_amount - secondOrder.total_amount;
        }

        return new Date(secondOrder.created_at).getTime() - new Date(firstOrder.created_at).getTime();
      });
  }, [orders, selectedStatus, searchTerm, dateFilter, sortOrder]);

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

  const statusCounts = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.all += 1;
        acc[order.status] += 1;
        return acc;
      },
      { all: 0, pending: 0, confirmed: 0, preparing: 0, delivered: 0, cancelled: 0 }
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
        {statusOptions.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setSelectedStatus(status)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
              selectedStatus === status ? 'bg-black text-white' : 'bg-white text-stone-500 border border-stone-200'
            }`}
          >
            {status === 'all' ? 'Todos' : statusLabels[status]} ({statusCounts[status]})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-lg border border-stone-100 bg-white shadow-sm">
          <div className="space-y-4 border-b border-stone-100 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-black">Fila de pedidos</h2>
              <span className="text-xs font-bold text-stone-400">{filteredOrders.length} pedidos encontrados</span>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
              <label className="relative block">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-stone-400">
                  search
                </span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por cliente, telefone, pedido ou produto"
                  className="h-11 w-full rounded-lg border border-stone-200 bg-white pl-10 pr-3 text-sm font-bold text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-black"
                  aria-label="Buscar pedidos"
                />
              </label>

              <label className="relative block">
                <select
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                  className="h-11 w-full appearance-none rounded-lg border border-stone-200 bg-white px-3 pr-9 text-sm font-bold text-stone-800 outline-none transition focus:border-black"
                  aria-label="Filtrar periodo"
                >
                  {(Object.keys(dateFilterLabels) as DateFilter[]).map((filter) => (
                    <option key={filter} value={filter}>
                      {dateFilterLabels[filter]}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-stone-400">
                  expand_more
                </span>
              </label>

              <label className="relative block">
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                  className="h-11 w-full appearance-none rounded-lg border border-stone-200 bg-white px-3 pr-9 text-sm font-bold text-stone-800 outline-none transition focus:border-black"
                  aria-label="Ordenar pedidos"
                >
                  <option value="recent">Mais recentes</option>
                  <option value="oldest">Mais antigos</option>
                  <option value="value-desc">Maior valor</option>
                  <option value="value-asc">Menor valor</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-stone-400">
                  expand_more
                </span>
              </label>
            </div>
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
                <p className="text-xs font-bold text-stone-400">Pagamento: {selectedOrder.payment_method || 'Nao informado'}</p>
                {selectedOrder.delivery_address && (
                  <p className="text-xs font-bold text-stone-400">Endereco: {selectedOrder.delivery_address}</p>
                )}
                {selectedOrder.delivery_zip_code && (
                  <p className="text-xs font-bold text-stone-400">CEP: {selectedOrder.delivery_zip_code}</p>
                )}
                {selectedOrder.delivery_zone_name && (
                  <p className="text-xs font-bold text-stone-400">
                    Frete: {formatMoney(selectedOrder.shipping_fee)} | {selectedOrder.delivery_zone_name}
                    {selectedOrder.delivery_estimate_days ? ` em ate ${selectedOrder.delivery_estimate_days} dia(s)` : ''}
                  </p>
                )}
                {getWhatsAppUrl(selectedOrder.customer_phone) && (
                  <a
                    href={getWhatsAppUrl(selectedOrder.customer_phone)!}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1FAF55]"
                  >
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    Chamar no WhatsApp
                  </a>
                )}
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
                {selectedOrder.discount_amount > 0 && (
                  <div className="mb-2 flex items-center justify-between text-sm font-bold text-emerald-700">
                    <span>Desconto{selectedOrder.promotion_code ? ` (${selectedOrder.promotion_code})` : ''}</span>
                    <span>- {formatMoney(selectedOrder.discount_amount)}</span>
                  </div>
                )}
                {selectedOrder.shipping_fee > 0 && (
                  <div className="mb-2 flex items-center justify-between text-sm font-bold text-stone-600">
                    <span>Frete</span>
                    <span>{formatMoney(selectedOrder.shipping_fee)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-lg font-bold text-black">
                  <span>Total</span>
                  <span>{formatMoney(selectedOrder.total_amount)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-stone-400">
                    Alterar status
                  </span>
                  <select
                    value={selectedOrder.status}
                    disabled={updatingId === selectedOrder.id}
                    onChange={(event) => updateOrderStatus(selectedOrder, event.target.value as OrderStatus)}
                    className="h-12 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold text-black outline-none transition focus:border-black disabled:opacity-50"
                  >
                    {statusFlow.concat('cancelled').map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
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
