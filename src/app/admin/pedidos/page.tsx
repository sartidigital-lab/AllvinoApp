"use client";

import { AdminEmptyState, AdminNotice, AdminPageHeader, AdminSection, AdminStatCard, AdminStatusBadge } from '@/components/admin/AdminPrimitives';
import { AdminOrderFilters } from '@/components/admin/AdminOrderFilters';
import { getAdminOrderTotals, getAdminStatusCounts, matchesAdminOrderPeriod, matchesAdminOrderStatus, type AdminOrderPeriod, type AdminOrderStatusFilter } from '@/lib/orders/adminFilters';
import { downloadOrderReceiptPdf } from '@/lib/orders/orderReceiptPdf';
import { getKitComponentOrderQuantity, getKitComponentsForOrderItem, getOrderItemName, getOrderItemWithComposition, type KitComponent } from '@/lib/orders/orderReceipt';
import { createClient } from '@/utils/supabase/admin-client';
import { useEffect, useMemo, useState } from 'react';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled';
type DateFilter = 'all' | 'today' | '7d' | '30d';
type SortOrder = 'recent' | 'oldest' | 'value-desc' | 'value-asc';

type AdminOrderItem = {
  product_id: string | null;
  quantity: number;
  unit_price: number;
  product_name: string | null;
};

type AdminProduct = {
  id: string;
  nome: string;
  tipo_produto: 'wine' | 'kit';
};

type KitCompositionRow = {
  kit_id: string;
  product_id: string;
  quantity: number;
};

type AdminOrder = {
  id: string;
  status: OrderStatus;
  total_amount: number;
  delivery_type: string;
  payment_method: string | null;
  payment_provider: string;
  payment_status: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  payment_reference: string | null;
  payment_url: string | null;
  paid_at: string | null;
  payment_error: string | null;
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
  preparing: 'Em separação',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const statusTones: Record<OrderStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  confirmed: 'info',
  preparing: 'neutral',
  delivered: 'success',
  cancelled: 'danger',
};

const statusFlow: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'delivered'];

const paymentStatusLabels: Record<AdminOrder['payment_status'], string> = {
  pending: 'Pagamento pendente',
  authorized: 'Autorizado',
  paid: 'Pago',
  failed: 'Falhou',
  refunded: 'Estornado',
  cancelled: 'Cancelado',
};

const paymentStatusTones: Record<AdminOrder['payment_status'], 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning',
  authorized: 'info',
  paid: 'success',
  failed: 'danger',
  refunded: 'neutral',
  cancelled: 'neutral',
};

const dateFilterLabels: Record<DateFilter, string> = {
  all: 'Todo período',
  today: 'Hoje',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
};

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

function getWhatsAppUrl(phone: string | null, message?: string) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;

  const normalizedPhone = digits.startsWith('55') ? digits : `55${digits}`;
  const encodedMessage = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${normalizedPhone}${encodedMessage}`;
}

function getWhatsAppOrderMessage(order: AdminOrder) {
  const items = order.order_items
    ?.map((item) => `- ${item.quantity}x ${getOrderItemName(item)}`)
    .join('\n') || '- Itens do pedido';

  return [
    `Olá, ${order.customer_name || 'tudo bem'}! Aqui é da Allvino.`,
    `Recebemos seu pedido #${order.id.slice(0, 8)}.`,
    '',
    items,
    '',
    `Total: ${formatMoney(order.total_amount)}`,
    `Status: ${statusLabels[order.status]}`,
    `Pagamento: ${paymentStatusLabels[order.payment_status]}`,
    '',
    'Vou seguir por aqui com a confirmação e próximos passos.',
  ].join('\n');
}

async function loadKitComponents(
  supabase: ReturnType<typeof createClient>,
  orders: AdminOrder[],
): Promise<{ components: Record<string, KitComponent[]>; error: boolean }> {
  const productIds = [...new Set(
    orders.flatMap((order) => order.order_items || [])
      .map((item) => item.product_id)
      .filter((id): id is string => Boolean(id)),
  )];
  if (productIds.length === 0) return { components: {}, error: false };

  const products: AdminProduct[] = [];
  for (let offset = 0; offset < productIds.length; offset += 80) {
    const { data, error } = await supabase.from('produtos').select('id,nome,tipo_produto').in('id', productIds.slice(offset, offset + 80));
    if (error) return { components: {}, error: true };
    products.push(...(data || []) as AdminProduct[]);
  }
  const kitIds = products.filter((product) => product.tipo_produto === 'kit').map((product) => product.id);
  if (kitIds.length === 0) return { components: {}, error: false };

  const composition: KitCompositionRow[] = [];
  for (let offset = 0; offset < kitIds.length; offset += 80) {
    const ids = kitIds.slice(offset, offset + 80);
    for (let page = 0; ; page += 250) {
      const { data, error } = await supabase.from('product_kit_items').select('kit_id,product_id,quantity').in('kit_id', ids).order('kit_id').order('product_id').range(page, page + 249);
      if (error) return { components: {}, error: true };
      const rows = (data || []) as KitCompositionRow[];
      composition.push(...rows);
      if (rows.length < 250) break;
    }
  }
  const namesById = new Map(products.map((product) => [product.id, product.nome]));
  const componentIds = [...new Set(composition.map((item) => item.product_id).filter((id) => !namesById.has(id)))];

  for (let offset = 0; offset < componentIds.length; offset += 80) {
    const { data: componentProducts, error: componentError } = await supabase
      .from('produtos')
      .select('id,nome,tipo_produto')
      .in('id', componentIds.slice(offset, offset + 80));
    if (componentError) return { components: {}, error: true };
    (componentProducts || []).forEach((product) => {
      const typedProduct = product as AdminProduct;
      namesById.set(typedProduct.id, typedProduct.nome);
    });
  }

  const components = composition.reduce<Record<string, KitComponent[]>>((acc, item) => {
    const quantity = Math.trunc(Number(item.quantity));
    if (!item.kit_id || !item.product_id || quantity < 1) return acc;
    acc[item.kit_id] = [
      ...(acc[item.kit_id] || []),
      {
        product_id: item.product_id,
        name: namesById.get(item.product_id) || 'Produto removido da composição',
        quantity_per_kit: quantity,
      },
    ];
    return acc;
  }, {});

  return { components, error: false };
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<AdminOrderStatusFilter>('all');
  const [period, setPeriod] = useState<AdminOrderPeriod>({ start: '', end: '' });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [kitComponentsById, setKitComponentsById] = useState<Record<string, KitComponent[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    const nextOrders: AdminOrder[] = [];
    const batchSize = 250;
    for (let offset = 0; ; offset += batchSize) {
      const { data, error } = await supabase
        .from('orders')
        .select('id,status,total_amount,delivery_type,payment_method,payment_provider,payment_status,payment_reference,payment_url,paid_at,payment_error,delivery_address,discount_amount,subtotal_amount,promotion_code,delivery_zip_code,delivery_zone_name,delivery_estimate_days,shipping_fee,created_at,customer_name,customer_phone,order_items(product_id,quantity,unit_price,product_name)')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + batchSize - 1);
      if (error) {
        setErrorMessage('Não foi possível carregar os pedidos.');
        setIsLoading(false);
        return;
      }
      const batch = (data || []) as AdminOrder[];
      nextOrders.push(...batch);
      if (batch.length < batchSize) break;
    }
    setOrders(nextOrders);
    setSelectedOrderId((current) => current || nextOrders[0]?.id || null);
    const kitComponents = await loadKitComponents(supabase, nextOrders);
    setKitComponentsById(kitComponents.components);
    if (kitComponents.error) {
      setErrorMessage('Pedidos carregados, mas não foi possível carregar a composição de alguns kits.');
    }
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
        const matchesStatus = matchesAdminOrderStatus(order, selectedStatus);
        const matchesDate = (!dateLimit || new Date(order.created_at).getTime() >= dateLimit) && matchesAdminOrderPeriod(order, period);
        const itemNames = order.order_items?.map(getOrderItemName).join(' ') || '';
        const kitComponentNames = order.order_items
          ?.flatMap((item) => getKitComponentsForOrderItem(item, kitComponentsById))
          .map((component) => component.name)
          .join(' ') || '';
        const searchableText = normalizeSearch(
          [
            order.id,
            order.customer_name,
            order.customer_phone,
            order.delivery_type,
            order.payment_method,
            order.payment_provider,
            paymentStatusLabels[order.payment_status],
            order.payment_reference,
            order.delivery_address,
            itemNames,
            kitComponentNames,
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
  }, [orders, selectedStatus, searchTerm, dateFilter, period, sortOrder, kitComponentsById]);

  const selectedOrder = useMemo(
    () => filteredOrders.find((order) => order.id === selectedOrderId) || filteredOrders[0] || null,
    [filteredOrders, selectedOrderId]
  );

  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [selectedStatus, searchTerm, dateFilter, period, sortOrder]);

  const summary = useMemo(() => {
    return filteredOrders.reduce(
      (acc, order) => {
        acc.total += 1;
        acc.revenue += order.total_amount;
        if (order.payment_status !== 'paid' && order.status !== 'cancelled') acc.paymentPending += 1;
        acc[order.status] += 1;
        return acc;
      },
      { total: 0, revenue: 0, paymentPending: 0, pending: 0, confirmed: 0, preparing: 0, delivered: 0, cancelled: 0 }
    );
  }, [filteredOrders]);

  const totals = useMemo(() => getAdminOrderTotals(filteredOrders), [filteredOrders]);
  const statusCounts = useMemo(() => {
    const dateLimit = getDateLimit(dateFilter);
    return getAdminStatusCounts(orders.filter((order) => (!dateLimit || new Date(order.created_at).getTime() >= dateLimit) && matchesAdminOrderPeriod(order, period)));
  }, [orders, dateFilter, period]);

  const updateOrderStatus = async (order: AdminOrder, status: OrderStatus) => {
    setUpdatingId(order.id);
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', order.id);

    if (error) {
      setErrorMessage('Não foi possível atualizar o status do pedido.');
      setUpdatingId(null);
      return;
    }

    setOrders((current) =>
      current.map((item) => (item.id === order.id ? { ...item, status } : item))
    );
    setUpdatingId(null);
  };

  const markManualPaymentPaid = async (order: AdminOrder) => {
    setUpdatingId(order.id);
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.rpc('mark_manual_payment_paid', {
      p_order_id: order.id,
    });

    if (error) {
      setErrorMessage('Não foi possível confirmar o pagamento manual.');
      setUpdatingId(null);
      return;
    }

    const paidAt = new Date().toISOString();
    setOrders((current) =>
      current.map((item) =>
        item.id === order.id
          ? {
              ...item,
              status: item.status === 'pending' ? 'confirmed' : item.status,
              payment_status: 'paid',
              paid_at: item.paid_at || paidAt,
              payment_error: null,
            }
          : item
      )
    );
    setUpdatingId(null);
  };

  const exportOrderPdf = async () => {
    if (!selectedOrder || isExportingPdf) return;

    setIsExportingPdf(true);
    setErrorMessage(null);
    try {
      await downloadOrderReceiptPdf({
        ...selectedOrder,
        status: statusLabels[selectedOrder.status],
        payment_status: paymentStatusLabels[selectedOrder.payment_status],
        items: (selectedOrder.order_items || []).map((item) => getOrderItemWithComposition(item, kitComponentsById)),
      });
    } catch {
      setErrorMessage('Não foi possível gerar o PDF do pedido. Tente novamente.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pedidos"
        description="Acompanhe, filtre e avance pedidos em operação com atendimento pelo WhatsApp."
        actions={(
          <button
            type="button"
            onClick={loadOrders}
            className="admin-button flex items-center gap-2 bg-black px-5 text-sm text-white transition hover:bg-stone-800"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Atualizar
          </button>
        )}
      />

      {errorMessage && (
        <AdminNotice tone="danger">{errorMessage}</AdminNotice>
      )}

      <AdminOrderFilters period={period} onPeriodChange={(value) => { setPeriod(value); setDateFilter('all'); }} status={selectedStatus} onStatusChange={setSelectedStatus} counts={statusCounts} />

      <div className="admin-stats-grid grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        <AdminStatCard label="Total" value={isLoading ? '...' : summary.total} icon="receipt_long" tone="dark" />
        <AdminStatCard label="Pendentes" value={isLoading ? '...' : summary.pending} icon="pending_actions" tone="accent" />
        <AdminStatCard label="Aguardando pagamento" value={isLoading ? '...' : summary.paymentPending} icon="payments" />
        <AdminStatCard label="Entregues" value={isLoading ? '...' : summary.delivered} icon="check_circle" />
        <AdminStatCard label="Valor dos pedidos" value={isLoading ? '...' : formatMoney(summary.revenue)} icon="monitoring" />
        <AdminStatCard label="Faturamento pago" value={isLoading ? '...' : formatMoney(totals.paid)} icon="payments" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <AdminSection
          title="Fila de pedidos"
          icon="format_list_bulleted"
          actions={<span className="text-xs font-bold text-stone-400">{filteredOrders.length} pedidos encontrados</span>}
        >
          <div className="space-y-4">
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
                  onChange={(event) => { setDateFilter(event.target.value as DateFilter); setPeriod({ start: '', end: '' }); }}
                  className="h-11 w-full appearance-none rounded-lg border border-stone-200 bg-white px-3 pr-9 text-sm font-bold text-stone-800 outline-none transition focus:border-black"
                  aria-label="Filtrar período"
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
            <AdminEmptyState icon="hourglass_top" title="Carregando pedidos..." />
          ) : filteredOrders.length === 0 ? (
            <AdminEmptyState icon="search_off" title="Nenhum pedido neste filtro" description="Ajuste status, período, busca ou ordenação para ampliar a fila." />
          ) : (
            <div className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-100">
              {paginatedOrders.map((order) => {
                const itemCount = order.order_items?.reduce((total, item) => total + item.quantity, 0) || 0;
                const isSelected = selectedOrder?.id === order.id;

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`grid w-full grid-cols-1 gap-3 p-4 text-left transition md:grid-cols-[1.2fr_1fr_auto] md:items-center md:p-5 ${
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
                      <AdminStatusBadge tone={statusTones[order.status]}>{statusLabels[order.status]}</AdminStatusBadge>
                      <span className="text-sm font-bold text-black">{formatMoney(order.total_amount)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {!isLoading && filteredOrders.length > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold text-stone-500">
              <span>Pagina {page} de {pageCount}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="admin-button border border-stone-200 bg-white px-3 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page === pageCount}
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  className="admin-button border border-stone-200 bg-white px-3 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </AdminSection>

        <aside className="admin-surface p-5 xl:sticky xl:top-24 xl:self-start">
          {!selectedOrder ? (
            <AdminEmptyState icon="receipt_long" title="Selecione um pedido" description="Os detalhes, ações e contato por WhatsApp aparecerão aqui." />
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Pedido</p>
                  <h2 className="mt-1 text-xl font-bold text-black">#{selectedOrder.id.slice(0, 8)}</h2>
                </div>
                <AdminStatusBadge tone={statusTones[selectedOrder.status]}>{statusLabels[selectedOrder.status]}</AdminStatusBadge>
              </div>

              <div className="space-y-2 rounded-lg bg-stone-50 p-4">
                <p className="font-bold text-black">{selectedOrder.customer_name || 'Cliente sem nome'}</p>
                <p className="text-sm font-bold text-stone-500">{selectedOrder.customer_phone || 'Telefone não informado'}</p>
                <p className="text-xs font-bold text-stone-400">{selectedOrder.delivery_type}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold text-stone-400">
                    Pagamento: {selectedOrder.payment_method || 'Não informado'} ({selectedOrder.payment_provider})
                  </p>
                  <AdminStatusBadge tone={paymentStatusTones[selectedOrder.payment_status]}>{paymentStatusLabels[selectedOrder.payment_status]}</AdminStatusBadge>
                </div>
                {selectedOrder.payment_reference && (
                  <p className="text-xs font-bold text-stone-400">Ref pagamento: {selectedOrder.payment_reference}</p>
                )}
                {selectedOrder.payment_url && (
                  <a
                    href={selectedOrder.payment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-xs font-bold text-blue-700 underline"
                  >
                    Link de pagamento
                  </a>
                )}
                {selectedOrder.payment_error && (
                  <p className="text-xs font-bold text-red-600">Erro pagamento: {selectedOrder.payment_error}</p>
                )}
                {selectedOrder.delivery_address && (
                  <p className="text-xs font-bold text-stone-400">Endereço: {selectedOrder.delivery_address}</p>
                )}
                {selectedOrder.delivery_zip_code && (
                  <p className="text-xs font-bold text-stone-400">CEP: {selectedOrder.delivery_zip_code}</p>
                )}
                {selectedOrder.delivery_zone_name && (
                  <p className="text-xs font-bold text-stone-400">
                    Frete: {formatMoney(selectedOrder.shipping_fee)} | {selectedOrder.delivery_zone_name}
                    {selectedOrder.delivery_estimate_days ? ` em até ${selectedOrder.delivery_estimate_days} dia(s)` : ''}
                  </p>
                )}
                {getWhatsAppUrl(selectedOrder.customer_phone) && (
                  <a
                    href={getWhatsAppUrl(selectedOrder.customer_phone, getWhatsAppOrderMessage(selectedOrder))!}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-button mt-2 inline-flex items-center gap-2 bg-[#25D366] px-3 text-xs text-white transition hover:bg-[#1FAF55]"
                  >
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    Enviar resumo no WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  disabled={isExportingPdf}
                  onClick={exportOrderPdf}
                  className="admin-button mt-2 inline-flex items-center gap-2 border border-stone-200 bg-white px-3 text-xs text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  {isExportingPdf ? 'Gerando PDF...' : 'Baixar extrato em PDF'}
                </button>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-400">Itens</h3>
                <div className="space-y-3">
                  {selectedOrder.order_items?.map((item, index) => {
                    const kitComponents = getKitComponentsForOrderItem(item, kitComponentsById);
                    return (
                      <div key={`${selectedOrder.id}-${index}`} className="rounded-lg border border-stone-100 p-3">
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="line-clamp-2 text-sm font-bold text-black">{getOrderItemName(item)}</p>
                              {kitComponents.length > 0 && <span className="rounded-full bg-[#F3EAE2] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8F1D2C]">Kit</span>}
                            </div>
                            <p className="text-xs font-bold text-stone-400">{item.quantity} x {formatMoney(item.unit_price)}</p>
                          </div>
                          <p className="shrink-0 text-sm font-bold text-black">{formatMoney(item.quantity * item.unit_price)}</p>
                        </div>
                        {kitComponents.length > 0 && (
                          <div className="mt-3 rounded-lg border border-[#F3EAE2] bg-[#FFFAF6] p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8F1D2C]">Composição do kit</p>
                            <div className="mt-2 space-y-1.5">
                              {kitComponents.map((component) => {
                                const totalQuantity = getKitComponentOrderQuantity(item.quantity, component.quantity_per_kit);
                                return (
                                  <div key={component.product_id} className="flex items-start justify-between gap-3 text-xs">
                                    <span className="min-w-0 font-semibold text-stone-700">{component.name}</span>
                                    <span className="shrink-0 font-bold text-stone-500">{component.quantity_per_kit} por kit · {totalQuantity} no pedido</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                    className="h-12 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm font-bold text-black outline-none transition focus:border-black disabled:opacity-50"
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
                    className="admin-button flex w-full items-center justify-center gap-2 bg-[#B91C1C] py-3 text-sm text-white transition hover:bg-red-800 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    Avançar para {statusLabels[nextStatus(selectedOrder.status)!]}
                  </button>
                )}
                {selectedOrder.payment_provider === 'manual' && selectedOrder.payment_status !== 'paid' && selectedOrder.status !== 'cancelled' && (
                  <button
                    type="button"
                    disabled={updatingId === selectedOrder.id}
                    onClick={() => markManualPaymentPaid(selectedOrder)}
                    className="admin-button flex w-full items-center justify-center gap-2 bg-emerald-700 py-3 text-sm text-white transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">payments</span>
                    Marcar pagamento como pago
                  </button>
                )}
                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                  <button
                    type="button"
                    disabled={updatingId === selectedOrder.id}
                    onClick={() => updateOrderStatus(selectedOrder, 'cancelled')}
                    className="admin-button w-full border border-red-100 bg-red-50 py-3 text-sm text-red-600 transition hover:bg-red-100 disabled:opacity-50"
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
