"use client";

import { useState, useMemo } from 'react';
import { useWines } from '@/hooks/useWines';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import { WineCardSkeleton, EmptyState, PageTransition } from '@/components/ui';

const priceRanges = [
  { label: 'Até R$50', min: 0, max: 50 },
  { label: 'R$50 - R$100', min: 50, max: 100 },
  { label: 'R$100 - R$200', min: 100, max: 200 },
  { label: 'R$200 - R$500', min: 200, max: 500 },
  { label: 'Acima de R$500', min: 500, max: Infinity },
];

function getStockStatus(stock: number) {
  if (stock === 0) return { label: 'Esgotado', color: 'bg-red-100 text-red-700', icon: 'block' };
  if (stock <= 5) return { label: `Últimas ${stock} un.`, color: 'bg-amber-100 text-amber-700', icon: 'warning' };
  return { label: `${stock} un.`, color: 'bg-emerald-100 text-emerald-700', icon: 'check_circle' };
}

export default function CatalogoPage() {
  const { wines, isLoading, isOffline } = useWines();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { recentlyViewed } = useRecentlyViewed();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState('');
  const [selectedGrape, setSelectedGrape] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const types = useMemo(() => [...new Set(wines.map((w) => w.type).filter(Boolean))], [wines]);
  const grapes = useMemo(() => [...new Set(wines.map((w) => w.grape).filter(Boolean))], [wines]);
  const regions = useMemo(() => [...new Set(wines.map((w) => w.region).filter(Boolean))], [wines]);

  const filteredWines = useMemo(() => {
    let result = [...wines];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.grape?.toLowerCase().includes(q) ||
          w.region?.toLowerCase().includes(q) ||
          w.type?.toLowerCase().includes(q)
      );
    }

    if (selectedPrice !== null) {
      const range = priceRanges[selectedPrice];
      result = result.filter((w) => w.price >= range.min && w.price < range.max);
    }

    if (selectedType) result = result.filter((w) => w.type === selectedType);
    if (selectedGrape) result = result.filter((w) => w.grape === selectedGrape);
    if (selectedRegion) result = result.filter((w) => w.region === selectedRegion);

    if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') result.sort((a, b) => b.price - a.price);
    else result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return result;
  }, [wines, search, sortBy, selectedPrice, selectedType, selectedGrape, selectedRegion]);

  const activeFilterCount = [selectedPrice !== null, selectedType, selectedGrape, selectedRegion, search].filter(Boolean).length;

  const clearFilters = () => {
    setSearch('');
    setSelectedPrice(null);
    setSelectedType('');
    setSelectedGrape('');
    setSelectedRegion('');
  };

  return (
    <PageTransition><main className="min-h-screen bg-[#FDFBF7] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="font-serif text-xl font-bold">Catálogo</h1>
          {isOffline && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Modo Offline</span>
          )}
          <button
            onClick={() => setIsFilterOpen(true)}
            className="relative p-2 hover:bg-stone-100 rounded-full transition"
          >
            <span className="material-symbols-outlined">tune</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#B91C1C] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Search & Sort */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Buscar vinho, uva, país..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
          >
            <option value="recent">Recentes</option>
            <option value="name">Nome</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
          </select>
        </div>
      </div>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="px-4 py-2 flex flex-wrap gap-2">
          {selectedPrice !== null && (
            <span className="inline-flex items-center gap-1 bg-[#B91C1C]/10 text-[#B91C1C] text-xs font-bold px-2.5 py-1 rounded-full">
              {priceRanges[selectedPrice].label}
              <button onClick={() => setSelectedPrice(null)} className="ml-1">×</button>
            </span>
          )}
          {selectedType && (
            <span className="inline-flex items-center gap-1 bg-[#B91C1C]/10 text-[#B91C1C] text-xs font-bold px-2.5 py-1 rounded-full">
              {selectedType}
              <button onClick={() => setSelectedType('')} className="ml-1">×</button>
            </span>
          )}
          {selectedGrape && (
            <span className="inline-flex items-center gap-1 bg-[#B91C1C]/10 text-[#B91C1C] text-xs font-bold px-2.5 py-1 rounded-full">
              {selectedGrape}
              <button onClick={() => setSelectedGrape('')} className="ml-1">×</button>
            </span>
          )}
          {selectedRegion && (
            <span className="inline-flex items-center gap-1 bg-[#B91C1C]/10 text-[#B91C1C] text-xs font-bold px-2.5 py-1 rounded-full">
              {selectedRegion}
              <button onClick={() => setSelectedRegion('')} className="ml-1">×</button>
            </span>
          )}
          <button onClick={clearFilters} className="text-xs font-bold text-stone-400 hover:text-[#B91C1C]">
            Limpar filtros
          </button>
        </div>
      )}

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && !search && selectedPrice === null && !selectedType && !selectedGrape && !selectedRegion && (
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg font-bold">Vistos Recentemente</h2>
            <a href="/favoritos" className="text-xs font-bold text-stone-400 hover:text-[#B91C1C]">
              Ver todos
            </a>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {recentlyViewed.slice(0, 8).map((wine) => (
              <a
                key={wine.id}
                href={`/catalogo/${wine.id}`}
                className="shrink-0 w-[140px] bg-white rounded-2xl border border-stone-100 overflow-hidden active:scale-[0.98] transition-transform"
              >
                <img
                  src={wine.image_url || 'https://via.placeholder.com/300x400'}
                  alt={wine.name}
                  className="w-full h-28 object-contain mix-blend-multiply p-2"
                />
                <div className="p-2">
                  <p className="text-[10px] font-bold text-stone-400 uppercase truncate">{wine.type || wine.region}</p>
                  <p className="font-bold text-xs line-clamp-2 mt-0.5">{wine.name}</p>
                  <p className="text-xs font-bold text-[#B91C1C] mt-1">
                    R$ {wine.price.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <WineCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredWines.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-[48px] text-stone-200">wine_bar</span>
            <p className="mt-4 font-bold text-stone-400">Nenhum vinho encontrado.</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="mt-2 text-sm font-bold text-[#B91C1C]">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredWines.map((wine) => {
              const stock = getStockStatus(wine.stock);
              return (
                <a
                  key={wine.id}
                  href={`/catalogo/${wine.id}`}
                  className="bg-white rounded-2xl border border-stone-100 overflow-hidden active:scale-[0.98] transition-transform"
                >
                  <div className="relative">
                    <img
                      src={wine.image_url || 'https://via.placeholder.com/300x400'}
                      alt={wine.name}
                      className="w-full h-48 object-contain mix-blend-multiply p-4"
                    />
                    <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${stock.color}`}>
                      <span className="material-symbols-outlined text-[12px] mr-0.5 align-middle">{stock.icon}</span>
                      {stock.label}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-bold text-stone-400 uppercase">{wine.type || wine.region}</p>
                    <p className="font-bold text-sm line-clamp-2 mt-0.5">{wine.name}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-bold text-[#B91C1C]">
                        R$ {wine.price.toFixed(2).replace('.', ',')}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleFavorite(wine);
                            showToast(isFavorite(wine.id) ? 'Removido dos favoritos' : 'Adicionado aos favoritos', 'info');
                          }}
                          className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-red-50 transition"
                        >
                          <span className={`material-symbols-outlined text-[16px] ${isFavorite(wine.id) ? 'text-[#B91C1C]' : 'text-stone-300'}`}>favorite</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            if (wine.stock > 0) { addToCart(wine); showToast('Vinho adicionado ao carrinho!', 'success'); }
                          }}
                        disabled={wine.stock === 0}
                        className="w-9 h-9 bg-[#B91C1C] text-white rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#991B1B] transition"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter Sidebar */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsFilterOpen(false)} />
          <div className="relative w-full max-w-sm h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg">Filtros</h2>
              <button onClick={() => setIsFilterOpen(false)} className="p-2 hover:bg-stone-100 rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase mb-3">Faixa de Preco</p>
                <div className="flex flex-wrap gap-2">
                  {priceRanges.map((range, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPrice(selectedPrice === i ? null : i)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        selectedPrice === i
                          ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-[#B91C1C]'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase mb-3">Tipo</p>
                <div className="flex flex-wrap gap-2">
                  {types.map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(selectedType === type ? '' : type)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        selectedType === type
                          ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-[#B91C1C]'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase mb-3">Uva</p>
                <div className="flex flex-wrap gap-2">
                  {grapes.map((grape) => (
                    <button
                      key={grape}
                      onClick={() => setSelectedGrape(selectedGrape === grape ? '' : grape)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        selectedGrape === grape
                          ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-[#B91C1C]'
                      }`}
                    >
                      {grape}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase mb-3">Pais</p>
                <div className="flex flex-wrap gap-2">
                  {regions.map((region) => (
                    <button
                      key={region}
                      onClick={() => setSelectedRegion(selectedRegion === region ? '' : region)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        selectedRegion === region
                          ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-[#B91C1C]'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t">
              <button
                onClick={() => setIsFilterOpen(false)}
                className="w-full bg-[#B91C1C] text-white py-3 rounded-xl font-bold"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </main></PageTransition>
  );
}
