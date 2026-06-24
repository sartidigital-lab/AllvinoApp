"use client";

import { Suspense, useEffect } from 'react';
import { useWine, useWines } from '@/hooks/useWines';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import { WineDetailSkeleton } from '@/components/ui';
import { useParams } from 'next/navigation';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getStockStatus(stock: number) {
  if (stock === 0) return { label: 'Esgotado', desc: 'Este vinho esta fora de estoque.', color: 'text-red-600 bg-red-50 border-red-200', icon: 'block' };
  if (stock <= 5) return { label: `Ultimas ${stock} unidades`, desc: 'Corra, estao quase esgotando!', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: 'warning' };
  return { label: `${stock} unidades disponiveis`, desc: 'Estoque disponivel para entrega.', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: 'check_circle' };
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

function getWhatsAppShareUrl(wine: { name: string; type?: string | null; category?: string | null; region?: string | null; price: number }) {
  const subtitle = [wine.type || wine.category || '', wine.region || ''].filter(Boolean).join(' · ');
  const lines = [
    'Confira este vinho na Allvino!',
    '',
    wine.name,
    ...(subtitle ? [subtitle] : []),
    '',
    formatMoney(wine.price),
    '',
    window.location.href,
  ];
  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}

export default function WineDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { wine, isLoading, error } = useWine(id);
  const { wines } = useWines();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { trackView } = useRecentlyViewed();

  useEffect(() => {
    if (wine) trackView(wine);
  }, [wine, trackView]);

  if (isLoading) return <WineDetailSkeleton />;

  if (error || !wine) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <span className="material-symbols-outlined text-[64px] text-stone-200">wine_bar</span>
        <p className="mt-4 text-lg font-bold">Vinho nao encontrado</p>
        <a href="/catalogo" className="mt-4 text-sm font-bold text-[#B91C1C]">
          Voltar ao catalogo
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
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="flex items-center px-4 py-3">
          <a href="/catalogo" className="p-2 hover:bg-stone-100 rounded-full transition">
            <span className="material-symbols-outlined">arrow_back</span>
          </a>
          <p className="ml-2 font-bold text-sm truncate">{wine.name}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-8">
          <div className="bg-white rounded-2xl border border-stone-100 p-8 flex items-center justify-center">
            <img src={wine.image_url || 'https://via.placeholder.com/300x400'} alt={wine.name} className="w-full max-h-[500px] object-contain mix-blend-multiply" />
          </div>

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
              {wine.region && productAttribute('public', 'Regiao', wine.region)}
              {wine.region && productAttribute('location_on', 'Regiao', wine.region)}
            </div>

            <div className="border-t border-stone-100 pt-6">
              <p className="text-3xl font-bold text-[#B91C1C]">{formatMoney(wine.price)}</p>
              <p className="text-xs text-stone-400 mt-1">Preco para pedidos online</p>
            </div>

            <div className={`flex items-center gap-3 p-4 rounded-xl border ${stock.color}`}>
              <span className="material-symbols-outlined text-[20px]">{stock.icon}</span>
              <div>
                <p className="font-bold text-sm">{stock.label}</p>
                <p className="text-xs opacity-70">{stock.desc}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { toggleFavorite(wine); showToast(isFavorite(wine.id) ? 'Removido dos favoritos' : 'Adicionado aos favoritos', 'info'); }}
                className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition ${isFavorite(wine.id) ? 'bg-red-50 border-red-200' : 'bg-white border-stone-200 hover:border-[#B91C1C]'}`}
              >
                <span className={`material-symbols-outlined text-[24px] ${isFavorite(wine.id) ? 'text-[#B91C1C]' : 'text-stone-400'}`}>favorite</span>
              </button>
              <a
                href={getWhatsAppShareUrl(wine)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no WhatsApp"
                className="w-14 h-14 rounded-2xl border border-stone-200 bg-white flex items-center justify-center hover:border-green-500 transition"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-600">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
              <button
                onClick={() => { addToCart(wine); showToast('Vinho adicionado ao carrinho!', 'success'); }}
                disabled={wine.stock === 0}
                className="flex-1 bg-[#B91C1C] text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-red-900/20 hover:scale-[1.02] active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {wine.stock === 0 ? 'Indisponivel' : 'Adicionar ao carrinho'}
              </button>
            </div>
            <a href="/catalogo" className="block text-center text-sm font-bold text-stone-400 hover:text-[#B91C1C] transition">
              Continuar comprando
            </a>
          </div>
        </div>

        {relatedWines.length > 0 && (
          <div className="mt-12">
            <h2 className="font-serif text-xl font-bold mb-4">Você também pode gostar</h2>
            <div className="grid grid-cols-3 gap-4">
              {relatedWines.map((w) => (
                <a key={w.id} href={`/catalogo/${w.id}`} className="bg-white rounded-2xl border border-stone-100 p-4 text-center active:scale-[0.98] transition-transform">
                  <img src={w.image_url || 'https://via.placeholder.com/300x400'} alt={w.name} className="w-full h-28 object-contain mix-blend-multiply mb-2" />
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
