"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminEmptyState, AdminNotice, AdminPageHeader, AdminSection, AdminStatCard, AdminStatusBadge } from '@/components/admin/AdminPrimitives';
import { createClient } from '@/utils/supabase/client';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled';
type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'cancelled';

type OrderItemWithWine = {
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
  payment_provider: string;
  payment_status: PaymentStatus;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  order_items: OrderItemWithWine[] | null;
};

type ProductRanking = {
  name: string;
  quantity: number;
  revenue: number;
};

type OperationalAction = {
  label: string;
  detail: string;
  href: string;
  icon: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  count: number;
};

type StockLevel = {
  product_code: string;
  quantity: number;
};

type CrmCard = {
  customer_key: string;
  priority: 'baixa' | 'normal' | 'alta';
  next_action_at: string | null;
};

type Conversation = {
  id: string;
  status: 'open' | 'waiting' | 'closed';
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

function getWineName(item: OrderItemWithWine) {
  if (item.product_name) return item.product_name;

  const wines = item.wines;
  if (Array.isArray(wines)) return wines[0]?.name || 'Produto removido';

  return wines?.name || 'Produto removido';
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function isDueTodayOrOverdue(value: string | null) {
  if (!value) return false;
  const actionDate = new Date(value);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return actionDate.getTime() <= endOfToday.getTime();
}

export default function AdminAnalyticsPage() {
  const [faturamento, setFaturamento] = useState(0);
  const [garrafas, setGarrafas] = useState(0);
  const [pedidos, setPedidos] = useState(0);
  const [topProducts, setTopProducts] = useState<ProductRanking[]>([]);
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([]);
  const [actions, setActions] = useState<OperationalAction[]>([]);
  const [openConversations, setOpenConversations] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const supabase = createClient();

      const [ordersResult, stockResult, crmResult, conversationsResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id,status,total_amount,delivery_type,payment_provider,payment_status,customer_name,customer_phone,created_at,order_items(quantity,unit_price,product_name,wines(name))')
          .order('created_at', { ascending: false })
          .limit(250),
        supabase
          .from('stock_levels')
          .select('product_code,quantity')
          .limit(500),
        supabase
          .from('customer_crm_cards')
          .select('customer_key,priority,next_action_at')
          .limit(500),
        supabase
          .from('customer_conversations')
          .select('id,status')
          .limit(500),
      ]);

      if (ordersResult.error) {
        setErrorMessage('Não foi possível carregar os indicadores agora.');
        setIsLoading(false);
        return;
      }

      const orders = (ordersResult.data || []) as AdminOrder[];
      const stockLevels = (stockResult.data || []) as StockLevel[];
      const crmCards = (crmResult.data || []) as CrmCard[];
      const conversations = (conversationsResult.data || []) as Conversation[];
      let totalFaturamento = 0;
      let totalGarrafas = 0;
      const ranking = new Map<string, ProductRanking>();

      orders.forEach((order) => {
        totalFaturamento += order.total_amount;

        order.order_items?.forEach((item) => {
          const productName = getWineName(item);
          const current = ranking.get(productName) || { name: productName, quantity: 0, revenue: 0 };

          current.quantity += item.quantity;
          current.revenue += item.quantity * item.unit_price;
          totalGarrafas += item.quantity;
          ranking.set(productName, current);
        });
      });

      const lowStockCount = stockLevels.filter((stock) => stock.quantity <= 5).length;
      const openConversationCount = conversations.filter((conversation) => conversation.status !== 'closed').length;
      const paymentPendingCount = orders.filter((order) => (
        order.payment_provider === 'manual' &&
        order.payment_status !== 'paid' &&
        order.status !== 'cancelled'
      )).length;

      setFaturamento(totalFaturamento);
      setGarrafas(totalGarrafas);
      setPedidos(orders.length);
      setLowStockProducts(lowStockCount);
      setOpenConversations(openConversationCount);
      setTopProducts(
        Array.from(ranking.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10)
      );
      setRecentOrders(orders.slice(0, 5));
      setActions([
        {
          label: 'Pedidos pendentes',
          detail: 'Pedidos que precisam de confirmação comercial.',
          href: '/admin/pedidos',
          icon: 'pending_actions',
          tone: 'warning',
          count: orders.filter((order) => order.status === 'pending').length,
        },
        {
          label: 'Pagamentos a confirmar',
          detail: 'Fluxos manuais ainda não marcados como pagos.',
          href: '/admin/pedidos',
          icon: 'payments',
          tone: 'danger',
          count: paymentPendingCount,
        },
        {
          label: 'Estoque baixo',
          detail: 'Códigos com 5 unidades ou menos.',
          href: '/admin/estoque',
          icon: 'production_quantity_limits',
          tone: 'warning',
          count: lowStockCount,
        },
        {
          label: 'Conversas abertas',
          detail: 'Atendimentos que ainda precisam de continuidade.',
          href: '/admin/conversas',
          icon: 'forum',
          tone: 'info',
          count: openConversationCount,
        },
        {
          label: 'Follow-ups vencendo',
          detail: 'Cards do CRM com próxima ação até hoje.',
          href: '/admin/crm',
          icon: 'event_upcoming',
          tone: 'danger',
          count: crmCards.filter((card) => isDueTodayOrOverdue(card.next_action_at)).length,
        },
        {
          label: 'Clientes alta prioridade',
          detail: 'Oportunidades marcadas como prioridade alta.',
          href: '/admin/crm',
          icon: 'priority_high',
          tone: 'danger',
          count: crmCards.filter((card) => card.priority === 'alta').length,
        },
      ]);

      if (stockResult.error || crmResult.error || conversationsResult.error) {
        setErrorMessage('Dashboard carregado, mas alguns alertas operacionais podem estar incompletos.');
      }

      setIsLoading(false);
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inteligência Allvino"
        description="Indicadores comerciais e fila operacional para o próximo melhor movimento."
        actions={(
          <Link href="/admin/pedidos" className="admin-button flex items-center gap-2 bg-[#B91C1C] px-5 text-sm text-white shadow-sm hover:bg-red-800">
            <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
            Ver Pedidos
          </Link>
        )}
      />

      {errorMessage && (
        <AdminNotice tone={errorMessage.startsWith('Dashboard carregado') ? 'warning' : 'danger'}>
          {errorMessage}
        </AdminNotice>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Faturamento" value={isLoading ? '...' : formatMoney(faturamento)} icon="payments" tone="dark" />
        <AdminStatCard label="Garrafas vendidas" value={isLoading ? '...' : garrafas} icon="wine_bar" />
        <AdminStatCard label="Total de pedidos" value={isLoading ? '...' : pedidos} icon="receipt_long" />
        <AdminStatCard label="Conversas abertas" value={isLoading ? '...' : openConversations} icon="forum" />
        <AdminStatCard label="Estoque baixo" value={isLoading ? '...' : lowStockProducts} icon="production_quantity_limits" tone="accent" />
      </div>

      <AdminSection title="Fila operacional" icon="assignment_late">
        {isLoading ? (
          <AdminEmptyState icon="hourglass_top" title="Carregando alertas..." />
        ) : actions.length === 0 ? (
          <AdminEmptyState icon="check_circle" title="Nenhum alerta operacional" description="Quando houver algo para acompanhar, os atalhos aparecerão aqui." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {actions.map((action) => (
              <Link key={action.label} href={action.href} className="rounded-lg border border-stone-100 bg-white p-4 transition hover:border-stone-300 hover:bg-stone-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-stone-500">{action.icon}</span>
                      <h3 className="truncate text-sm font-bold text-black">{action.label}</h3>
                    </div>
                    <p className="mt-2 text-xs font-bold text-stone-500">{action.detail}</p>
                  </div>
                  <AdminStatusBadge tone={action.count > 0 ? action.tone : 'success'} className="shrink-0">
                    {action.count}
                  </AdminStatusBadge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </AdminSection>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AdminSection title="Top 10 Produtos" icon="emoji_events">
          {isLoading ? (
            <AdminEmptyState icon="hourglass_top" title="Calculando ranking..." />
          ) : topProducts.length === 0 ? (
            <AdminEmptyState icon="wine_bar" title="Nenhum produto vendido ainda" />
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center gap-3 rounded-lg border border-stone-100 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-bold text-stone-600">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-black">{product.name}</p>
                    <p className="text-xs font-bold text-stone-400">{product.quantity} garrafas</p>
                  </div>
                  <span className="text-sm font-bold text-black">{formatMoney(product.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </AdminSection>

        <AdminSection title="Pedidos Recentes" icon="receipt_long" actions={<Link href="/admin/pedidos" className="text-xs font-bold text-stone-500 hover:text-black">Ver todos</Link>}>
          {isLoading ? (
            <AdminEmptyState icon="hourglass_top" title="Carregando pedidos..." />
          ) : recentOrders.length === 0 ? (
            <AdminEmptyState icon="receipt_long" title="Nenhum pedido registrado ainda" />
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link key={order.id} href="/admin/pedidos" className="flex items-center justify-between gap-4 rounded-lg border border-stone-100 p-3 transition hover:bg-stone-50">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-black">Pedido #{order.id.slice(0, 8)}</p>
                    <p className="text-xs font-bold text-stone-400">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')} | {order.customer_name || order.delivery_type}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-black">{formatMoney(order.total_amount)}</p>
                    <AdminStatusBadge tone={statusTones[order.status]} className="mt-1 min-h-6 px-2 py-0 text-[10px] uppercase">
                      {statusLabels[order.status]}
                    </AdminStatusBadge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </AdminSection>
      </div>
    </div>
  );
}
