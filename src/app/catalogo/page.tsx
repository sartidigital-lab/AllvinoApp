"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useWines } from '@/hooks/useWines';
import { useCart } from '@/context/CartContext';

type PriceRange = {
  label: string;
  min: number;
  max: number;
};

const priceRanges: PriceRange[] = [
  { label: 'Ate R$ 40', min: 0, max: 40 },
  { label: 'R$ 40 a R$ 100', min: 40.01, max: 100 },
  { label: 'R$ 100 a R$ 500', min: 100.01, max: 500 },
  { label: 'R$ 500 a R$ 1.000', min: 500.01, max: 1000 },
  { label: 'Acima de R$ 1.000', min: 1000.01, max: Number.POSITIVE_INFINITY },
];

function uniqueSorted(values: Array<string | null>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );
}

export default function CatalogoPage() {
  const { wines, isLoading, isOffline } = useWines();
  const { addToCart } = useCart();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<PriceRange | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedGrape, setSelectedGrape] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const types = useMemo(() => uniqueSorted(wines.map((wine) => wine.type)), [wines]);
  const grapes = useMemo(() => uniqueSorted(wines.map((wine) => wine.grape)), [wines]);
  const countries = useMemo(() => uniqueSorted(wines.map((wine) => wine.region)), [wines]);

  const filteredWines = useMemo(() => {
    return wines.filter((wine) => {
      const matchesPrice = !selectedPrice || (wine.price >= selectedPrice.min && wine.price <= selectedPrice.max);
      const matchesType = !selectedType || wine.type === selectedType;
      const matchesGrape = !selectedGrape || wine.grape === selectedGrape;
      const matchesCountry = !selectedCountry || wine.region === selectedCountry;

      return matchesPrice && matchesType && matchesGrape && matchesCountry;
    });
  }, [wines, selectedPrice, selectedType, selectedGrape, selectedCountry]);

  const activeFilterCount = [selectedPrice, selectedType, selectedGrape, selectedCountry].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedPrice(null);
    setSelectedType(null);
    setSelectedGrape(null);
    setSelectedCountry(null);
  };

  const filterButtonClass = (isSelected: boolean) =>
    `rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
      isSelected ? 'border-black bg-black text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-black'
    }`;

  return (
    <main className="max-w-4xl mx-auto px-5 pt-6 pb-24">
      <div className="flex justify-between items-end mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold font-serif" id="titulo-pagina">Catalogo</h1>
          {isOffline && (
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded">Modo Offline</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsFilterOpen(true)}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-black shadow-sm transition hover:border-black"
          aria-label="Abrir filtros"
        >
          <span className="material-symbols-outlined text-[22px]">tune</span>
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#B91C1C] text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {activeFilterCount > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {selectedPrice && <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">{selectedPrice.label}</span>}
          {selectedType && <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">{selectedType}</span>}
          {selectedGrape && <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">{selectedGrape}</span>}
          {selectedCountry && <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">{selectedCountry}</span>}
          <button type="button" onClick={clearFilters} className="text-xs font-bold text-[#B91C1C] underline">
            Limpar filtros
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-center py-12 animate-pulse font-bold text-stone-400">CARREGANDO ADEGA...</p>
      ) : filteredWines.length === 0 ? (
        <p className="text-center text-stone-400 font-bold py-12">Nenhum vinho encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {filteredWines.map((wine) => (
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
                  <button
                    onClick={(event) => {
                      event.preventDefault();
                      addToCart(wine);
                    }}
                    className="bg-black text-white p-3 rounded-2xl flex items-center justify-center hover:bg-stone-800 transition active:scale-90"
                  >
                    <span className="material-symbols-outlined">add_shopping_cart</span>
                  </button>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {isFilterOpen && (
        <div className="fixed inset-0 z-[70] flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsFilterOpen(false)} />
          <aside className="relative flex h-full w-full max-w-[88%] flex-col bg-white shadow-2xl sm:max-w-sm">
            <div className="flex items-center justify-between border-b border-stone-100 bg-[#FDFBF7] p-5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-black">tune</span>
                <h2 className="text-xl font-bold font-serif text-black">Filtros</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-stone-200"
                aria-label="Fechar filtros"
              >
                <span className="material-symbols-outlined text-black">close</span>
              </button>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto p-5 pb-28">
              <section>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-stone-400">Faixa de preco</h3>
                <div className="grid grid-cols-1 gap-2">
                  {priceRanges.map((range) => (
                    <button
                      key={range.label}
                      type="button"
                      onClick={() => setSelectedPrice(selectedPrice?.label === range.label ? null : range)}
                      className={filterButtonClass(selectedPrice?.label === range.label)}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-stone-400">Tipo de vinho</h3>
                <div className="flex flex-wrap gap-2">
                  {types.length === 0 ? (
                    <p className="text-sm font-bold text-stone-400">Nenhum tipo disponivel.</p>
                  ) : (
                    types.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedType(selectedType === type ? null : type)}
                        className={filterButtonClass(selectedType === type)}
                      >
                        {type}
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-stone-400">Tipo de uva</h3>
                <div className="flex flex-wrap gap-2">
                  {grapes.length === 0 ? (
                    <p className="text-sm font-bold text-stone-400">Nenhuma uva disponivel.</p>
                  ) : (
                    grapes.map((grape) => (
                      <button
                        key={grape}
                        type="button"
                        onClick={() => setSelectedGrape(selectedGrape === grape ? null : grape)}
                        className={filterButtonClass(selectedGrape === grape)}
                      >
                        {grape}
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-stone-400">Pais</h3>
                <div className="flex flex-wrap gap-2">
                  {countries.length === 0 ? (
                    <p className="text-sm font-bold text-stone-400">Nenhum pais disponivel.</p>
                  ) : (
                    countries.map((country) => (
                      <button
                        key={country}
                        type="button"
                        onClick={() => setSelectedCountry(selectedCountry === country ? null : country)}
                        className={filterButtonClass(selectedCountry === country)}
                      >
                        {country}
                      </button>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex gap-3 border-t border-stone-100 bg-white p-5">
              <button
                type="button"
                onClick={clearFilters}
                className="flex-1 rounded-2xl border border-stone-200 py-3 text-sm font-bold text-stone-600 transition hover:border-black"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 rounded-2xl bg-[#B91C1C] py-3 text-sm font-bold text-white transition hover:bg-red-800"
              >
                Ver {filteredWines.length} vinhos
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
