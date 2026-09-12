"use client";

import { useFavorites } from '@/context/FavoritesContext';
import { EmptyState, PageTransition, ProductImage } from '@/components/ui';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { Heart, Plus } from 'lucide-react';
import Link from 'next/link';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FavoritosPage() {
  const { favorites, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  return (
    <PageTransition><main className="min-h-screen bg-brand-bg pb-24">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="flex items-center px-4 py-3">
          <h1 className="font-serif text-xl font-bold">Favoritos</h1>
          <span className="ml-2 text-sm text-stone-400 font-bold">({favorites.length})</span>
        </div>
      </div>
      <div className="px-4 pt-4">
        {favorites.length === 0 ? (
          <EmptyState
            icon="favorite"
            title="Nenhum favorito ainda"
            description="Toque no coração nos vinhos do catálogo para salvar seus preferidos aqui."
            action={{ label: 'Ver catálogo', href: '/catalogo' }}
          />
        ) : (
          <div className="space-y-3">
            {favorites.map((wine) => (
              <div key={wine.id} className="surface-card flex items-center gap-4 p-4">
                <Link href={`/catalogo/${wine.id}`} className="flex-shrink-0">
                  <ProductImage src={wine.image_url} alt={wine.name} width={64} height={80} sizes="64px" className="h-20 w-16 object-contain mix-blend-multiply" />
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-stone-400 uppercase">{wine.type || wine.region}</p>
                  <p className="font-bold text-sm line-clamp-2">{wine.name}</p>
                  <p className="mt-1 text-sm font-bold text-brand-primary">{formatMoney(wine.price)}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button type="button" aria-label="Remover dos favoritos" onClick={() => { toggleFavorite(wine); showToast('Removido dos favoritos', 'info'); }} className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-red-50 transition">
                    <Heart className="h-5 w-5 fill-current text-brand-primary" aria-hidden="true" />
                  </button>
                  <button type="button" aria-label="Adicionar ao carrinho" onClick={() => { if (wine.stock > 0) { addToCart(wine); showToast('Vinho adicionado ao carrinho!', 'success'); } }} disabled={wine.stock === 0} className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-white transition hover:bg-brand-primary-hover disabled:opacity-30">
                    <Plus className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main></PageTransition>
  );
}
