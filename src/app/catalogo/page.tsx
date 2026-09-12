"use client";

import { Suspense, useState, useMemo, useDeferredValue } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWines } from '@/hooks/useWines';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import { WineCardSkeleton, EmptyState, PageTransition, ProductImage } from '@/components/ui';
import { Ban, CheckCircle, Heart, Plus, Search, SlidersHorizontal, TriangleAlert, Wine, X } from 'lucide-react';
import Image from 'next/image';
import CatalogBanners from '@/components/catalog/CatalogBanners';

const priceRanges = [
  { label: 'Até R$50', min: 0, max: 50 },
  { label: 'R$50 - R$100', min: 50, max: 100 },
  { label: 'R$100 - R$200', min: 100, max: 200 },
  { label: 'R$200 - R$500', min: 200, max: 500 },
  { label: 'Acima de R$500', min: 500, max: Infinity },
];

function getStockStatus(stock: number) {
  if (stock === 0) return { label: 'Esgotado', color: 'bg-red-100 text-red-700', icon: Ban };
  if (stock <= 5) return { label: `Últimas ${stock} un.`, color: 'bg-amber-100 text-amber-700', icon: TriangleAlert };
  return { label: `${stock} un.`, color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle };
}
function CatalogoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const promotionSlug = searchParams.get('promocao') || '';
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
  const deferredSearch = useDeferredValue(search);

  const types = useMemo(() => [...new Set(wines.map((w) => w.type).filter(Boolean))], [wines]);
  const grapes = useMemo(() => [...new Set(wines.map((w) => w.grape).filter(Boolean))], [wines]);
  const regions = useMemo(() => [...new Set(wines.map((w) => w.region).filter(Boolean))], [wines]);

  const filteredWines = useMemo(() => {
    let result = [...wines];

    if (promotionSlug) {
      result = result.filter((wine) => wine.promotion_slug === promotionSlug);
    }

    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
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
  }, [wines, deferredSearch, sortBy, selectedPrice, selectedType, selectedGrape, selectedRegion, promotionSlug]);

  const selectedPromotion = useMemo(
    () => wines.find((wine) => wine.promotion_slug === promotionSlug),
    [wines, promotionSlug]
  );

  const activeFilterCount = [selectedPrice !== null, selectedType, selectedGrape, selectedRegion, search].filter(Boolean).length;

  const clearFilters = () => {
    setSearch('');
    setSelectedPrice(null);
    setSelectedType('');
    setSelectedGrape('');
    setSelectedRegion('');
  };

  return (
    <PageTransition><main className="min-h-screen bg-brand-bg pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="font-serif text-xl font-bold">Catálogo</h1>
          {isOffline && (
            <span role="status" aria-live="polite" className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Modo Offline</span>
          )}
          <button
            onClick={() => setIsFilterOpen(true)}
            className="relative inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold hover:bg-stone-100 transition"
            aria-label={activeFilterCount > 0 ? `Abrir filtros, ${activeFilterCount} ativos` : 'Abrir filtros'}
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Search & Sort */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Buscar por nome, uva ou região"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-brand-lg border border-brand-border bg-brand-surface-elevated py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
          <label htmlFor="catalog-sort" className="sr-only sm:not-sr-only sm:self-center sm:text-xs sm:font-bold sm:text-stone-500">Ordenar por</label>
          <select
            id="catalog-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Ordenar produtos"
            className="rounded-brand-lg border border-brand-border bg-brand-surface-elevated px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="recent">Mais recentes</option>
            <option value="name">Nome</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
          </select>
        </div>
      </div>

      <CatalogBanners />

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="px-4 py-2 flex flex-wrap gap-2">
          {search && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-bold text-brand-primary">
              Busca: “{search}”
              <button type="button" onClick={() => setSearch('')} className="ml-1" aria-label="Remover busca">×</button>
            </span>
          )}
          {selectedPrice !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-bold text-brand-primary">
              {priceRanges[selectedPrice].label}
              <button type="button" onClick={() => setSelectedPrice(null)} className="ml-1" aria-label="Remover filtro de preço">×</button>
            </span>
          )}
          {selectedType && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-bold text-brand-primary">
              {selectedType}
              <button type="button" onClick={() => setSelectedType('')} className="ml-1" aria-label="Remover filtro de tipo">×</button>
            </span>
          )}
          {selectedGrape && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-bold text-brand-primary">
              {selectedGrape}
              <button type="button" onClick={() => setSelectedGrape('')} className="ml-1" aria-label="Remover filtro de uva">×</button>
            </span>
          )}
          {selectedRegion && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-bold text-brand-primary">
              {selectedRegion}
              <button type="button" onClick={() => setSelectedRegion('')} className="ml-1" aria-label="Remover filtro de região">×</button>
            </span>
          )}
          <button onClick={clearFilters} className="text-xs font-bold text-stone-400 hover:text-brand-primary">
            Limpar filtros
          </button>
        </div>
      )}

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && !promotionSlug && !search && selectedPrice === null && !selectedType && !selectedGrape && !selectedRegion && (
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg font-bold">Vistos Recentemente</h2>
            <Link href="/favoritos" className="text-xs font-bold text-stone-400 hover:text-brand-primary">
              Ver todos
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {recentlyViewed.slice(0, 8).map((wine) => (
              <Link
                key={wine.id}
                href={`/catalogo/${wine.id}`}
                className="surface-card shrink-0 w-[140px] overflow-hidden active:scale-[0.98] transition-transform"
              >
                <ProductImage
                  src={wine.image_url}
                  alt={wine.name}
                  width={300}
                  height={400}
                  sizes="140px"
                  className="w-full h-28 object-contain mix-blend-multiply p-2"
                />
                <div className="p-2">
                  <p className="truncate text-[10px] font-bold uppercase text-stone-400">{wine.type || wine.region}</p>
                  <p className="font-bold text-xs line-clamp-2 mt-0.5">{wine.name}</p>
                  <p className="mt-1 text-xs font-bold text-brand-primary">
                    R$ {wine.price.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div id="produtos-promocao" className="scroll-mt-36 px-4 pt-4">
        {promotionSlug && !isLoading && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-brand-primary">Seleção promocional</p>
              <h2 className="mt-1 font-serif text-xl font-bold">{selectedPromotion?.promotion_title || 'Produtos em promoção'}</h2>
            </div>
            <div className="flex items-center gap-3">
              {selectedPromotion?.discount_percent && <span className="rounded-full bg-brand-primary px-3 py-1.5 text-sm font-black text-white">{selectedPromotion.discount_percent}% OFF</span>}
              <button type="button" onClick={() => router.replace('/catalogo', { scroll: false })} className="text-sm font-bold text-stone-500 hover:text-black">Ver todo o catálogo</button>
            </div>
          </div>
        )}
        {!isLoading && (
          <div className="mb-3 flex items-center justify-between gap-3 text-xs font-bold text-stone-500" role="status" aria-live="polite">
            <span>{filteredWines.length} {filteredWines.length === 1 ? 'vinho encontrado' : 'vinhos encontrados'}</span>
            {activeFilterCount > 0 && <span className="text-brand-primary">Filtros ativos</span>}
          </div>
        )}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <WineCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredWines.length === 0 ? (
          <div className="text-center py-16">
            <Wine className="mx-auto h-12 w-12 text-stone-200" aria-hidden="true" />
            <p className="mt-4 font-bold text-stone-400">Nenhum vinho encontrado.</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="mt-2 text-sm font-bold text-brand-primary">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredWines.map((wine) => {
              const stock = getStockStatus(wine.stock);
              const StockIcon = stock.icon;
              return (
                <Link
                  key={wine.id}
                  href={`/catalogo/${wine.id}`}
                  className="surface-card overflow-hidden active:scale-[0.98] transition-transform"
                >
                  <div className="relative">
                    <ProductImage
                      src={wine.image_url}
                      alt={wine.name}
                      width={300}
                      height={400}
                      sizes="(max-width: 768px) 50vw, 320px"
                      className="w-full h-48 object-contain mix-blend-multiply p-4"
                    />
                    <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${stock.color}`}>
                      <StockIcon className="mr-0.5 inline h-3 w-3 align-[-2px]" aria-hidden="true" />
                      {stock.label}
                    </span>
                    {wine.discount_percent && (
                      <span className="absolute left-2 top-2 rounded-full bg-brand-primary px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
                        {wine.discount_percent}% OFF
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-bold uppercase text-stone-400">{wine.type || wine.region}</p>
                    <p className="font-bold text-sm line-clamp-2 mt-0.5">{wine.name}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="flex flex-col font-bold text-brand-primary">
                        {wine.discount_percent && wine.base_price && wine.base_price > wine.price && (
                          <span className="text-[10px] text-stone-400 line-through">R$ {wine.base_price.toFixed(2).replace('.', ',')}</span>
                        )}
                        <span>R$ {wine.price.toFixed(2).replace('.', ',')}</span>
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(wine);
                            showToast(isFavorite(wine.id) ? 'Removido dos favoritos' : 'Adicionado aos favoritos', 'info');
                          }}
                          type="button"
                          aria-label={isFavorite(wine.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                          className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-red-50 transition"
                        >
                          <Heart className={`h-4 w-4 ${isFavorite(wine.id) ? 'fill-current text-brand-primary' : 'text-stone-300'}`} aria-hidden="true" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (wine.stock > 0) { addToCart(wine); showToast('Vinho adicionado ao carrinho!', 'success'); }
                          }}
                        type="button"
                        aria-label="Adicionar ao carrinho"
                        disabled={wine.stock === 0}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-white transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      </div>
                    </div>
                  </div>
                </Link>
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
              <button onClick={() => setIsFilterOpen(false)} className="p-2 hover:bg-stone-100 rounded-full" aria-label="Fechar filtros">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <p className="mb-3 text-xs font-bold uppercase text-stone-400">Faixa de preço</p>
                <div className="flex flex-wrap gap-2">
                  {priceRanges.map((range, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPrice(selectedPrice === i ? null : i)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        selectedPrice === i
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-brand-primary'
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
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-brand-primary'
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
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-brand-primary'
                      }`}
                    >
                      {grape}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-bold uppercase text-stone-400">País</p>
                <div className="flex flex-wrap gap-2">
                  {regions.map((region) => (
                    <button
                      key={region}
                      onClick={() => setSelectedRegion(selectedRegion === region ? '' : region)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        selectedRegion === region
                          ? 'bg-brand-primary text-white border-brand-primary'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-brand-primary'
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
                className="w-full rounded-brand-lg bg-brand-primary py-3 font-bold text-white"
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

export default function CatalogoPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-brand-bg" />}>
      <CatalogoContent />
    </Suspense>
  );
}
