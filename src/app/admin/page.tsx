"use client";

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Order } from '@/types/database';

export default function AdminAnalyticsPage() {
  const [faturamento, setFaturamento] = useState(0);
  const [garrafas, setGarrafas] = useState(0);
  const [pedidos, setPedidos] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const supabase = createClient();
      
      // Fetch orders and items
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*)');

      if (!ordersError && ordersData) {
        let totalFaturamento = 0;
        let totalGarrafas = 0;

        ordersData.forEach(order => {
          totalFaturamento += order.total_amount;
          if (order.order_items) {
            order.order_items.forEach((item: any) => {
              totalGarrafas += item.quantity;
            });
          }
        });

        setFaturamento(totalFaturamento);
        setGarrafas(totalGarrafas);
        setPedidos(ordersData.length);
      }
      setIsLoading(false);
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-stone-200 pb-6 flex-wrap gap-4">
        <h1 className="text-3xl font-bold font-serif text-black">Inteligência Allvino</h1>
        <button type="button" className="bg-[#B91C1C] text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-red-800 transition flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span> Lançar Pedido
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-black text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <span className="material-symbols-outlined text-[100px]">payments</span>
          </div>
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Faturamento</p>
          <h3 className="text-4xl font-bold mt-2">
            {isLoading ? '...' : `R$ ${faturamento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
          </h3>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Garrafas Vendidas</p>
          <h3 className="text-4xl font-bold mt-2 text-black">{isLoading ? '...' : garrafas}</h3>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Total de Pedidos</p>
          <h3 className="text-4xl font-bold mt-2 text-black">{isLoading ? '...' : pedidos}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-black">
            <span className="material-symbols-outlined text-yellow-500">emoji_events</span> Top 10 Produtos
          </h3>
          <div className="py-4 text-center text-stone-400 text-sm font-bold">
            Gráfico/Ranking em desenvolvimento...
          </div>
        </div>
        
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-black">
            <span className="material-symbols-outlined text-blue-500">storefront</span> Vendas por Vendedor
          </h3>
          <div className="py-4 text-center text-stone-400 text-sm font-bold">
            Ranking de equipe em desenvolvimento...
          </div>
        </div>
      </div>
    </div>
  );
}
