"use client";

import { useWines } from '@/hooks/useWines';
import Link from 'next/link';

export default function CatalogoPage() {
  const { wines, isLoading, isOffline } = useWines();

  return (
    <main className="max-w-4xl mx-auto px-5 pt-6 pb-24">
      <div className="flex justify-between items-end mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold font-serif" id="titulo-pagina">Catálogo</h1>
          {isOffline && (
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded">Modo Offline</span>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-center py-12 animate-pulse font-bold text-stone-400">CARREGANDO ADEGA...</p>
      ) : wines.length === 0 ? (
        <p className="text-center text-stone-400 font-bold py-12">Nenhum vinho encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {wines.map((wine) => (
            <div key={wine.id} className="bg-white p-4 rounded-3xl shadow-sm border border-stone-100 flex flex-col h-full hover:shadow-md transition-shadow">
              <Link href={`/catalogo/${wine.id}`} className="block h-full flex flex-col">
                <div className="aspect-[3/4] bg-stone-50 rounded-2xl flex items-center justify-center p-6 mb-4 relative overflow-hidden group">
                  <img 
                    src={wine.image_url || 'https://via.placeholder.com/300x400?text=Sem+Imagem'} 
                    alt={wine.name}
                    className="h-full w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <h3 className="font-bold text-xl line-clamp-2">{wine.name}</h3>
                <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-1">
                  {wine.category || 'Vinho'}
                </p>
                <div className="flex justify-between items-end mt-auto pt-5">
                  <span className="text-2xl font-bold">R$ {wine.price.toFixed(2).replace('.', ',')}</span>
                  <div className="bg-black text-white p-3 rounded-2xl flex items-center justify-center hover:bg-stone-800 transition">
                    Ver Detalhes
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
