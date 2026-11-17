"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

export type Selection = { id: string; title: string; description: string; image_url: string; mobile_image_url: string | null; product_ids: string[] };

export function SelectionBanners() {
  const [selections, setSelections] = useState<Selection[]>([]);
  useEffect(() => { fetch('/api/selecoes').then((response) => response.ok ? response.json() : []).then((data) => { if (Array.isArray(data)) setSelections(data); }).catch(() => undefined); }, []);
  if (!selections.length) return null;
  return <section aria-label="Seleções em destaque" className="mx-auto max-w-6xl space-y-4 px-5 py-8"><h2 className="font-serif text-2xl font-bold">Seleções especiais</h2><div className="grid gap-4">{selections.map((selection) => <Link key={selection.id} href={`/selecao/${selection.id}`} className="group block overflow-hidden rounded-3xl border border-stone-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"><div className="relative aspect-[16/9] overflow-hidden bg-stone-900 sm:aspect-[16/5]"><picture>{selection.mobile_image_url && <source media="(max-width: 639px)" srcSet={selection.mobile_image_url} />}<img src={selection.image_url} alt="" className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02]" /></picture></div><div className="flex flex-wrap items-center justify-between gap-3 p-4"><div><h3 className="font-serif text-xl font-bold text-stone-950">{selection.title}</h3>{selection.description && <p className="mt-1 text-sm text-stone-600">{selection.description}</p>}</div><span className="text-sm font-bold text-brand-primary">Ver seleção →</span></div></Link>)}</div></section>;
}
