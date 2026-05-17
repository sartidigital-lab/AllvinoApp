"use client";

import { useWine } from '@/hooks/useWines';
import Link from 'next/link';
import { use } from 'react';

export default function WineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { wine, isLoading, isOffline } = useWine(resolvedParams.id);

  if (isLoading) {
    return (
      <main className="max-w-4xl mx-auto px-5 pt-6 pb-24">
        <p className="text-center py-12 animate-pulse font-bold text-stone-400">CARREGANDO DETALHES...</p>
      </main>
    );
  }

  if (!wine) {
    return (
      <main className="max-w-4xl mx-auto px-5 pt-6 pb-24 text-center">
        <h1 className="text-2xl font-bold font-serif mb-4">Vinho não encontrado</h1>
        <Link href="/catalogo" className="text-stone-500 hover:text-black underline">Voltar para o catálogo</Link>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-5 pt-6 pb-24">
      <div className="mb-6">
        <Link href="/catalogo" className="flex items-center gap-2 text-stone-500 hover:text-black transition">
          <span>&larr;</span> <span className="font-bold text-sm uppercase tracking-widest">Voltar</span>
        </Link>
      </div>

      <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-stone-100 flex flex-col md:flex-row gap-10">
        <div className="w-full md:w-1/2 aspect-[3/4] bg-stone-50 rounded-2xl flex items-center justify-center p-8 relative">
          {isOffline && (
             <span className="absolute top-4 right-4 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded">Offline</span>
          )}
          <img 
            src={wine.image_url || 'https://via.placeholder.com/300x400?text=Sem+Imagem'} 
            alt={wine.name}
            className="w-full h-full object-contain mix-blend-multiply"
          />
        </div>

        <div className="w-full md:w-1/2 flex flex-col justify-center">
          <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-2">
            {wine.category || 'Vinho'}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold font-serif mb-4">{wine.name}</h1>
          <p className="text-stone-600 mb-8 leading-relaxed">
            {wine.description || 'Nenhuma descrição disponível para este vinho.'}
          </p>
          
          <div className="mt-auto">
            <p className="text-sm text-stone-500 mb-1">Estoque: {wine.stock} disponíveis</p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">R$ {wine.price.toFixed(2).replace('.', ',')}</span>
              <button className="bg-[#B91C1C] text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-red-900/20 active:scale-95 transition">
                Adicionar
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
