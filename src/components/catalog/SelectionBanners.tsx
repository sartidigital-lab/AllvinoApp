"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

export type Selection = { id: string; title: string; description: string; image_url: string; mobile_image_url: string | null; product_ids: string[] };

export function SelectionBanners() {
  const [selections, setSelections] = useState<Selection[]>([]);
  useEffect(() => { fetch('/api/selecoes').then((response) => response.ok ? response.json() : []).then((data) => { if (Array.isArray(data)) setSelections(data); }).catch(() => undefined); }, []);
  if (!selections.length) return null;
  return <section aria-label="Seleções em destaque" className="mx-auto max-w-6xl space-y-4 px-5 py-8"><h2 className="font-serif text-2xl font-bold">Seleções especiais</h2><div className="grid gap-4 md:grid-cols-2">{selections.map((selection) => <Link key={selection.id} href={`/selecao/${selection.id}`} className="group relative block min-h-64 overflow-hidden rounded-3xl bg-stone-900"><picture>{selection.mobile_image_url && <source media="(max-width: 767px)" srcSet={selection.mobile_image_url} />}<img src={selection.image_url} alt="" className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105" /></picture><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" /><div className="relative flex min-h-64 flex-col justify-end p-6 text-white"><h3 className="font-serif text-3xl font-bold">{selection.title}</h3>{selection.description && <p className="mt-2 text-sm">{selection.description}</p>}<span className="mt-4 w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-black">Ver seleção</span></div></Link>)}</div></section>;
}
