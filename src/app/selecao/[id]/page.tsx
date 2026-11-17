"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useWines } from '@/hooks/useWines';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { WinePrice, formatCatalogDiscountPercent } from '@/components/catalog/WinePrice';
import { ProductImage } from '@/components/ui';
import { getMaxCartQuantity, sanitizeWine } from '@/lib/catalog/sanitizeWine';
import type { Selection } from '@/components/catalog/SelectionBanners';
import type { Wine } from '@/types/database';

export default function SelectionPage() {
  const { id } = useParams<{ id: string }>();
  const { wines, isLoading, error: catalogError } = useWines();
  const { cart, addToCart, setIsCartOpen } = useCart();
  const { showToast } = useToast();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    fetch('/api/selecoes')
      .then((response) => {
        if (!response.ok) throw new Error('Falha ao carregar seleções');
        return response.json();
      })
      .then((data) => {
        if (active) setSelection(Array.isArray(data) ? data.find((item: Selection) => item.id === id) || null : null);
      })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const products = selection?.product_ids.flatMap((productId) => {
    const product = wines.find((wine) => wine.id === productId);
    return product ? [product] : [];
  }) || [];

  const addProduct = (wine: Wine) => {
    if (!sanitizeWine(wine)) {
      showToast('Não foi possível adicionar este produto. Atualize a página e tente novamente.', 'error');
      return;
    }
    const quantity = cart.find((item) => item.id === wine.id)?.quantity || 0;
    if (wine.stock <= 0 || quantity >= Math.min(wine.stock, getMaxCartQuantity())) {
      showToast('Quantidade máxima disponível no carrinho.', 'info');
      return;
    }
    addToCart(wine);
    showToast(`${wine.name} adicionado ao carrinho!`, 'success');
  };

  if (loading || isLoading) return <main className="mx-auto max-w-6xl p-8" role="status">Carregando seleção...</main>;
  if (loadError || catalogError) return <main className="mx-auto max-w-6xl p-8"><p role="alert">Não foi possível carregar a seleção. Verifique sua conexão e tente novamente.</p><Link href="/catalogo" className="mt-4 inline-block text-brand-primary underline">Voltar ao catálogo</Link></main>;
  if (!selection) return <main className="mx-auto max-w-6xl p-8"><p>Seleção indisponível.</p><Link href="/catalogo" className="mt-4 inline-block text-brand-primary underline">Ver catálogo</Link></main>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8">
      <Link href="/catalogo" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-stone-600 hover:text-brand-primary">← Voltar ao catálogo</Link>
      <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-stone-900 sm:aspect-[16/5]">
        <picture>
          {selection.mobile_image_url && <source media="(max-width: 639px)" srcSet={selection.mobile_image_url} />}
          <img src={selection.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </picture>
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-serif text-3xl font-bold text-stone-950">{selection.title}</h1>{selection.description && <p className="mt-2 text-sm text-stone-600">{selection.description}</p>}</div>
        {cart.length > 0 && <button type="button" onClick={() => setIsCartOpen(true)} className="text-sm font-bold text-brand-primary underline">Ver carrinho ({cart.reduce((total, item) => total + item.quantity, 0)})</button>}
      </div>
      <div className="mt-6 grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((wine) => {
          const quantity = cart.find((item) => item.id === wine.id)?.quantity || 0;
          const unavailable = wine.stock <= 0;
          const atLimit = !unavailable && quantity >= Math.min(wine.stock, getMaxCartQuantity());
          return <article key={wine.id} className="flex h-full min-w-0 flex-col rounded-xl border border-stone-200 bg-white p-3">
            <Link href={`/catalogo/${wine.id}`} className="flex flex-1 flex-col rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary">
              <div className="relative"><ProductImage src={wine.image_url} alt={wine.name} width={300} height={400} className="h-40 w-full object-contain sm:h-48" />{Boolean(wine.discount_percent) && <span className="absolute right-0 top-0 rounded bg-red-700 px-2 py-1 text-xs font-bold text-white">-{formatCatalogDiscountPercent(wine.discount_percent!)}%</span>}</div>
              <h2 className="my-3 break-words text-sm font-bold sm:text-base">{wine.name}</h2>
            </Link>
            <WinePrice wine={wine} reserveSpace />
            <button type="button" disabled={unavailable || atLimit} onClick={() => addProduct(wine)} className="mt-4 min-h-11 w-full rounded-lg bg-[#82c341] px-2 py-3 text-sm font-bold text-white transition hover:bg-[#6eae31] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-50">{unavailable ? 'Indisponível' : atLimit ? 'Limite no carrinho' : quantity > 0 ? 'Adicionar novamente' : 'Adicionar ao carrinho'}</button>
          </article>;
        })}
      </div>
      {!products.length && <p className="mt-8 text-stone-500">Nenhum produto disponível nesta seleção.</p>}
    </main>
  );
}
