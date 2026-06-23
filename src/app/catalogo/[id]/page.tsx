"use client";

import { Suspense } from 'react';
import { useWine, useWines } from '@/hooks/useWines';
import { useCart } from '@/context/CartContext';
import { WineDetailSkeleton } from '@/components/ui';
import { useParams } from 'next/navigation';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getStockStatus(stock: number) {
  if (stock === 0) return { label: 'Esgotado', desc: 'Este vinho está fora de estoque.', color: 'text-red-600 bg-red-50 border-red-200', icon: 'block' };
  if (stock <= 5) return { label: `Últimas ${stock} unidades`, desc: 'Corra, estão quase esgotando!', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: 'warning' };
  return { label: `${stock} unidades disponíveis`, desc: 'Estoque disponível para entrega.', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: 'check_circle' };
}

function productAttribute(icon: string, label: string, value: string) {
  return (
    <div className="bg-stone-50 border border-stone-100 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[14px] text-stone-400">{icon}</span>
        <span className="text-[10px] font-bold text-stone-400 uppercase">{label}</span>
      </div>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}

export default function WineDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { wine, isLoading, error } = useWine(id);
  const { wines } = useWines();
  const { addToCart } = useCart();

  if (isLoading) return <WineDetailSkeleton />;

  if (error || !wine) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <span className="material-symbols-outlined text-[64px] text-stone-200">wine_bar</span>
        <p className="mt-4 text-lg font-bold">Vinho não encontrado</p>
        <a href="/catalogo" className="mt-4 text-sm font-bold text-[#B91C1C]">
          ← Voltar ao catálogo
        </a>
      </div>
    );
  }

  const stock = getStockStatus(wine.stock);

  const relatedWines = wines
    .filter((w) => w.id !== wine.id && (w.type === wine.type || w.region === wine.region || w.category === wine.category || w.grape === wine.grape))
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="flex items-center px-4 py-3">
          <a href="/catalogo" className="p-2 hover:bg-stone-100 rounded-full transition">
            <span className="material-symbols-outlined">arrow_back</span>
          </a>
          <p className="ml-2 font-bold text-sm truncate">{wine.name}</p>
        </div>
      </div>

      {/* Product Display */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-8">
          {/* Image */}
          <div className="bg-white rounded-2xl border border-stone-100 p-8 flex items-center justify-center">
            <img
              src={wine.image_url || 'https://via.placeholder.com/300x400'}
              alt={wine.name}
              className="w-full max-h-[500px] object-contain mix-blend-multiply"
            />
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                {wine.category || wine.type} · {wine.region || wine.region}
              </p>
              <h1 className="font-serif text-3xl font-bold mt-2">{wine.name}</h1>
              {wine.description && (
                <p className="mt-3 text-stone-500 text-sm leading-relaxed">{wine.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {wine.type && productAttribute('wine_bar', 'Tipo', wine.type)}
              {wine.grape && productAttribute('grass', 'Uva', wine.grape)}
              {wine.region && productAttribute('public', 'Região', wine.region)}
              {wine.region && productAttribute('location_on', 'Região', wine.region)}
            </div>

            <div className="border-t border-stone-100 pt-6">
              <p className="text-3xl font-bold text-[#B91C1C]">{formatMoney(wine.price)}</p>
              <p className="text-xs text-stone-400 mt-1">Preço para pedidos online</p>
            </div>

            <div className={`flex items-center gap-3 p-4 rounded-xl border ${stock.color}`}>
              <span className="material-symbols-outlined text-[20px]">{stock.icon}</span>
              <div>
                <p className="font-bold text-sm">{stock.label}</p>
                <p className="text-xs opacity-70">{stock.desc}</p>
              </div>
            </div>

            <button
              onClick={() => addToCart(wine)}
              disabled={wine.stock === 0}
              className="w-full bg-[#B91C1C] text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-red-900/20 hover:scale-[1.02] active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {wine.stock === 0 ? 'Indisponível' : 'Adicionar ao Carrinho'}
            </button>
          </div>
        </div>

        {/* Related Wines */}
        {relatedWines.length > 0 && (
          <div className="mt-12">
            <h2 className="font-serif text-xl font-bold mb-4">Você também pode gostar</h2>
            <div className="grid grid-cols-3 gap-4">
              {relatedWines.map((w) => (
                <a
                  key={w.id}
                  href={`/catalogo/${w.id}`}
                  className="bg-white rounded-2xl border border-stone-100 p-4 text-center active:scale-[0.98] transition-transform"
                >
                  <img
                    src={w.image_url || 'https://via.placeholder.com/300x400'}
                    alt={w.name}
                    className="w-full h-28 object-contain mix-blend-multiply mb-2"
                  />
                  <p className="font-bold text-xs line-clamp-2">{w.name}</p>
                  <p className="text-xs font-bold text-[#B91C1C] mt-1">{formatMoney(w.price)}</p>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
