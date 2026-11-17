"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useWines } from '@/hooks/useWines';
import { useCart } from '@/context/CartContext';
import { WinePrice, formatCatalogDiscountPercent } from '@/components/catalog/WinePrice';
import { ProductImage } from '@/components/ui';
import type { Selection } from '@/components/catalog/SelectionBanners';

export default function SelectionPage() {
  const { id } = useParams<{ id: string }>();
  const { wines, isLoading } = useWines();
  const { addToCart } = useCart();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; fetch('/api/selecoes').then((response) => response.ok ? response.json() : []).then((data) => { if (active && Array.isArray(data)) setSelection(data.find((item: Selection) => item.id === id) || null); }).catch(() => undefined).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id]);
  const products = selection?.product_ids.flatMap((productId) => { const product = wines.find((wine) => wine.id === productId); return product ? [product] : []; }) || [];
  if (loading || isLoading) return <main className="mx-auto max-w-6xl p-8">Carregando seleção...</main>;
  if (!selection) return <main className="mx-auto max-w-6xl p-8"><p>Seleção indisponível.</p><Link href="/catalogo" className="text-brand-primary underline">Ver catálogo</Link></main>;
  return <main className="mx-auto max-w-6xl px-5 py-8"><div className="relative flex min-h-64 items-end overflow-hidden rounded-3xl bg-stone-900 p-8 text-white"><picture>{selection.mobile_image_url && <source media="(max-width: 767px)" srcSet={selection.mobile_image_url} />}<img src={selection.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" /></picture><div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" /><div className="relative"><h1 className="font-serif text-4xl font-bold">{selection.title}</h1>{selection.description && <p className="mt-3">{selection.description}</p>}</div></div><div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{products.map((wine) => <article key={wine.id} className="rounded-xl border border-stone-200 bg-white p-3"><Link href={`/catalogo/${wine.id}`}><div className="relative"><ProductImage src={wine.image_url} alt={wine.name} width={300} height={400} className="h-48 w-full object-contain" />{Boolean(wine.discount_percent) && <span className="absolute right-0 top-0 rounded bg-red-700 px-2 py-1 text-xs font-bold text-white">-{formatCatalogDiscountPercent(wine.discount_percent!)}%</span>}</div><h2 className="my-3 font-bold">{wine.name}</h2></Link><WinePrice wine={wine} /><button type="button" disabled={wine.stock === 0} onClick={() => addToCart(wine)} className="mt-4 w-full rounded-lg bg-[#82c341] p-3 text-sm font-bold text-white disabled:opacity-40">{wine.stock === 0 ? 'Indisponível' : 'Adicionar ao carrinho'}</button></article>)}</div>{!products.length && <p className="mt-8 text-stone-500">Nenhum produto disponível nesta seleção.</p>}</main>;
}
