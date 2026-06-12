"use client";

import { AdminPageHeader, AdminSection, AdminStatCard } from '@/components/admin/AdminPrimitives';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

type OrderItemWithWine = {
  quantity: number;
  unit_price: number;
  product_name: string | null;
  wines: { name: string } | { name: string }[] | null;
};

type AdminOrder = {
  id: string;
  status: string;
  total_amount: number;
  delivery_type: string;
  created_at: string;
  order_items: OrderItemWithWine[] | null;
};

type ProductRanking = {
  name: string;
  quantity: number;
  revenue: number;
};

function getWineName(item: OrderItemWithWine) {
  if (item.product_name) {
    return item.product_name;
  }

  const wines = item.wines;
  if (Array.isArray(wines)) {
    return wines[0]?.name || 'Produto removido';
  }

  return wines?.name || 'Produto removido';
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminAnalyticsPage() {
  const [faturamento, setFaturamento] = useState(0);
  const [garrafas, setGarrafas] = useState(0);
  const [pedidos, setPedidos] = useState(0);
  const [topProducts, setTopProducts] = useState<ProductRanking[]>([]);
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const supabase = createClient();

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, total_amount, delivery_type, created_at, order_items(quantity, unit_price, product_name, wines(name))')
        .order('created_at', { ascending: false });

      if (ordersError) {
        setErrorMessage('Não foi possível carregar os indicadores agora.');
        setIsLoading(false);
        return;
      }

      const orders = (ordersData || []) as AdminOrder[];
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

      setFaturamento(totalFaturamento);
      setGarrafas(totalGarrafas);
      setPedidos(orders.length);
      setTopProducts(
        Array.from(ranking.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10)
      );
      setRecentOrders(orders.slice(0, 5));
      setIsLoading(false);
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inteligência Allvino"
        description="Indicadores comerciais, ranking de produtos e pedidos recentes."
        actions={(
          <button type="button" className="admin-button flex items-center gap-2 bg-[#B91C1C] px-5 text-sm text-white shadow-sm hover:bg-red-800">
            <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
            Lançar Pedido
          </button>
        )}
      />

      {errorMessage && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <AdminStatCard
          label="Faturamento"
          value={isLoading ? '...' : formatMoney(faturamento)}
          icon="payments"
          tone="dark"
        />
        <AdminStatCard label="Garrafas Vendidas" value={isLoading ? '...' : garrafas} icon="wine_bar" />
        <AdminStatCard label="Total de Pedidos" value={isLoading ? '...' : pedidos} icon="receipt_long" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AdminSection title="Top 10 Produtos" icon="emoji_events">
          {isLoading ? (
            <div className="py-4 text-center text-sm font-bold text-stone-400">Calculando ranking...</div>
          ) : topProducts.length === 0 ? (
            <div className="py-4 text-center text-sm font-bold text-stone-400">Nenhum produto vendido ainda.</div>
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

        <AdminSection title="Pedidos Recentes" icon="receipt_long">
          {isLoading ? (
            <div className="py-4 text-center text-sm font-bold text-stone-400">Carregando pedidos...</div>
          ) : recentOrders.length === 0 ? (
            <div className="py-4 text-center text-sm font-bold text-stone-400">Nenhum pedido registrado ainda.</div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-4 rounded-lg border border-stone-100 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-black">Pedido #{order.id.slice(0, 8)}</p>
                    <p className="text-xs font-bold text-stone-400">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')} | {order.delivery_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-black">{formatMoney(order.total_amount)}</p>
                    <span className="text-[10px] font-bold uppercase text-stone-400">{order.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSection>
      </div>
    </div>
  );
}
