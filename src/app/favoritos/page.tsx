"use client";

import { useFavorites } from '@/context/FavoritesContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FavoritosPage() {
  const { favorites, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  return (
    <main className="min-h-screen bg-[#FDFBF7] pb-24">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="flex items-center px-4 py-3">
          <h1 className="font-serif text-xl font-bold">Favoritos</h1>
          <span className="ml-2 text-sm text-stone-400 font-bold">({favorites.length})</span>
        </div>
      </div>
      <div className="px-4 pt-4">
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-[48px] text-stone-200">favorite</span>
            <p className="mt-4 font-bold text-stone-400">Nenhum favorito ainda.</p>
            <p className="text-sm text-stone-300 mt-1">Toque no coracao nos vinhos para salvar aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((wine) => (
              <div key={wine.id} className="bg-white rounded-2xl border border-stone-100 p-4 flex gap-4 items-center">
                <a href={`/catalogo/${wine.id}`} className="flex-shrink-0">
                  <img src={wine.image_url || 'https://via.placeholder.com/300x400'} alt={wine.name} className="w-16 h-20 object-contain mix-blend-multiply" />
                </a>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-stone-400 uppercase">{wine.type || wine.region}</p>
                  <p className="font-bold text-sm line-clamp-2">{wine.name}</p>
                  <p className="font-bold text-[#B91C1C] text-sm mt-1">{formatMoney(wine.price)}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => { toggleFavorite(wine); showToast('Removido dos favoritos', 'info'); }} className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-red-50 transition">
                    <span className="material-symbols-outlined text-[#B91C1C]">favorite</span>
                  </button>
                  <button onClick={() => { if (wine.stock > 0) { addToCart(wine); showToast('Vinho adicionado ao carrinho!', 'success'); } }} disabled={wine.stock === 0} className="w-10 h-10 rounded-full bg-[#B91C1C] text-white flex items-center justify-center disabled:opacity-30 hover:bg-[#991B1B] transition">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
