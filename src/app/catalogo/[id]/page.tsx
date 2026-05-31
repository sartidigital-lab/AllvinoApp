"use client";

import { useMemo, useState, use } from 'react';
import Link from 'next/link';
import { useWine, useWines } from '@/hooks/useWines';
import { useCart } from '@/context/CartContext';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getStockStatus(stock: number) {
  if (stock <= 0) {
    return {
      label: 'Esgotado',
      description: 'Este rotulo esta temporariamente indisponivel.',
      className: 'border-red-100 bg-red-50 text-red-700',
      icon: 'block',
    };
  }

  if (stock <= 5) {
    return {
      label: `Ultimas ${stock} unidades`,
      description: 'Baixo estoque disponivel para compra.',
      className: 'border-amber-100 bg-amber-50 text-amber-700',
      icon: 'inventory_2',
    };
  }

  return {
    label: `${stock} unidades disponiveis`,
    description: 'Pronto para adicionar ao pedido.',
    className: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    icon: 'inventory_2',
  };
}

function productAttribute(label: string, value: string | null | undefined, icon: string) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-black">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-black">{value}</p>
    </div>
  );
}

export default function WineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { wine, isLoading, isOffline } = useWine(resolvedParams.id);
  const { wines } = useWines();
  const { addManyToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  const relatedWines = useMemo(() => {
    if (!wine) return [];

    return wines
      .filter((item) => item.id !== wine.id)
      .filter((item) => item.type === wine.type || item.region === wine.region || item.grape === wine.grape)
      .slice(0, 3);
  }, [wine, wines]);

  const handleAddToCart = () => {
    if (!wine || wine.stock <= 0) return;
    addManyToCart([{ ...wine, quantity: Math.min(quantity, wine.stock) }]);
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-8">
        <div className="rounded-3xl border border-stone-100 bg-white p-8 shadow-sm">
          <p className="animate-pulse py-12 text-center text-sm font-bold uppercase tracking-widest text-stone-400">
            Carregando detalhes...
          </p>
        </div>
      </main>
    );
  }

  if (!wine) {
    return (
      <main className="mx-auto max-w-4xl px-5 pb-24 pt-8 text-center">
        <div className="rounded-3xl border border-stone-100 bg-white p-8 shadow-sm">
          <h1 className="mb-4 font-serif text-2xl font-bold text-black">Vinho nao encontrado</h1>
          <Link href="/catalogo" className="text-sm font-bold text-[#B91C1C] underline">
            Voltar para o catalogo
          </Link>
        </div>
      </main>
    );
  }

  const stockStatus = getStockStatus(wine.stock);
  const isOutOfStock = wine.stock <= 0;

  return (
    <main className="mx-auto max-w-5xl px-5 pb-24 pt-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/catalogo" className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-stone-500 transition hover:text-black">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Catalogo
        </Link>
        {isOffline && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Modo Offline</span>
        )}
      </div>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div className="rounded-[2rem] border border-stone-100 bg-white p-5 shadow-sm md:p-8">
          <div className="aspect-[4/5] rounded-[1.5rem] bg-stone-50 p-8 md:p-12">
            <img
              src={wine.image_url || 'https://via.placeholder.com/500x650?text=Sem+Imagem'}
              alt={wine.name}
              className="h-full w-full object-contain mix-blend-multiply"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#B91C1C]">
              {wine.category || 'Vinho premium'}
            </p>
            <h1 className="font-serif text-4xl font-bold leading-tight text-black md:text-5xl">{wine.name}</h1>
            <p className="mt-5 text-base font-medium leading-7 text-stone-600">
              {wine.description || 'Descricao ainda nao cadastrada para este rotulo.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {productAttribute('Tipo', wine.type, 'wine_bar')}
            {productAttribute('Uva', wine.grape, 'yard')}
            {productAttribute('Pais', wine.region, 'public')}
            {productAttribute('Selecao', wine.category, 'verified')}
          </div>

          <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Valor</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-bold text-black">{formatMoney(wine.price)}</p>
                <p className="mt-1 text-xs font-bold text-stone-400">Pedido enviado pelo WhatsApp da Allvino</p>
              </div>
              <div className="flex h-12 items-center rounded-2xl border border-stone-200 bg-stone-50">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  disabled={isOutOfStock}
                  className="flex h-12 w-12 items-center justify-center text-black transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300"
                  aria-label="Diminuir quantidade"
                >
                  <span className="material-symbols-outlined text-[20px]">remove</span>
                </button>
                <span className="w-10 text-center text-sm font-bold text-black">{isOutOfStock ? 0 : quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(wine.stock, current + 1))}
                  disabled={isOutOfStock || quantity >= wine.stock}
                  className="flex h-12 w-12 items-center justify-center text-black transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-300"
                  aria-label="Aumentar quantidade"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
              </div>
            </div>

            <div className={`mt-5 flex items-center gap-3 rounded-2xl border px-4 py-3 ${stockStatus.className}`}>
              <span className="material-symbols-outlined text-[20px]">{stockStatus.icon}</span>
              <div>
                <p className="text-sm font-bold">{stockStatus.label}</p>
                <p className="text-xs font-bold opacity-70">{stockStatus.description}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-6 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-red-900/20 transition hover:bg-red-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none"
            >
              <span className="material-symbols-outlined text-[20px]">{isOutOfStock ? 'block' : 'add_shopping_cart'}</span>
              {isOutOfStock ? 'Produto esgotado' : 'Adicionar ao carrinho'}
            </button>

            <Link
              href="/catalogo"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 py-4 text-sm font-bold text-stone-700 transition hover:border-black hover:text-black"
            >
              Continuar comprando
            </Link>
          </div>
        </div>
      </section>

      {relatedWines.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Sugestoes</p>
              <h2 className="font-serif text-2xl font-bold text-black">Voce tambem pode gostar</h2>
            </div>
            <Link href="/catalogo" className="text-xs font-bold uppercase tracking-widest text-[#B91C1C]">
              Ver catalogo
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {relatedWines.map((item) => (
              <Link
                key={item.id}
                href={`/catalogo/${item.id}`}
                className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-3 aspect-[4/5] rounded-xl bg-stone-50 p-5">
                  <img
                    src={item.image_url || 'https://via.placeholder.com/300x400?text=Sem+Imagem'}
                    alt={item.name}
                    className="h-full w-full object-contain mix-blend-multiply"
                  />
                </div>
                <p className="line-clamp-2 text-sm font-bold text-black">{item.name}</p>
                <p className="mt-2 text-sm font-bold text-[#B91C1C]">{formatMoney(item.price)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
