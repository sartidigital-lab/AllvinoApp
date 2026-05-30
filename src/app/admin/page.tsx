"use client";

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
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-stone-200 pb-6 flex-wrap gap-4">
        <h1 className="text-3xl font-bold font-serif text-black">Inteligência Allvino</h1>
        <button type="button" className="bg-[#B91C1C] text-white px-6 py-2.5 rounded-lg font-bold shadow-lg hover:bg-red-800 transition flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span> Lançar Pedido
        </button>
      </div>

      {errorMessage && (
        <div className="border border-red-100 bg-red-50 px-4 py-3 rounded-lg text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-black text-white p-6 rounded-lg shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <span className="material-symbols-outlined text-[100px]">payments</span>
          </div>
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Faturamento</p>
          <h3 className="text-4xl font-bold mt-2">
            {isLoading ? '...' : `R$ ${faturamento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
          </h3>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-stone-100 shadow-sm">
          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Garrafas Vendidas</p>
          <h3 className="text-4xl font-bold mt-2 text-black">{isLoading ? '...' : garrafas}</h3>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-stone-100 shadow-sm">
          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Total de Pedidos</p>
          <h3 className="text-4xl font-bold mt-2 text-black">{isLoading ? '...' : pedidos}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg border border-stone-100 shadow-sm p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-black">
            <span className="material-symbols-outlined text-yellow-500">emoji_events</span> Top 10 Produtos
          </h3>
          {isLoading ? (
            <div className="py-4 text-center text-stone-400 text-sm font-bold">Calculando ranking...</div>
          ) : topProducts.length === 0 ? (
            <div className="py-4 text-center text-stone-400 text-sm font-bold">Nenhum produto vendido ainda.</div>
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
                  <span className="text-sm font-bold text-black">
                    R$ {product.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg border border-stone-100 shadow-sm p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-black">
            <span className="material-symbols-outlined text-blue-500">receipt_long</span> Pedidos Recentes
          </h3>
          {isLoading ? (
            <div className="py-4 text-center text-stone-400 text-sm font-bold">Carregando pedidos...</div>
          ) : recentOrders.length === 0 ? (
            <div className="py-4 text-center text-stone-400 text-sm font-bold">Nenhum pedido registrado ainda.</div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-4 rounded-lg border border-stone-100 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-black">Pedido #{order.id.slice(0, 8)}</p>
                    <p className="text-xs font-bold text-stone-400">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')} • {order.delivery_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-black">
                      R$ {order.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{order.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
