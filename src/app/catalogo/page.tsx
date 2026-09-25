"use client";

import { useState, useMemo, useDeferredValue, useEffect } from 'react';
import Link from 'next/link';
import { useWines } from '@/hooks/useWines';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import { WineCardSkeleton, EmptyState, PageTransition, ProductImage } from '@/components/ui';
import { Ban, Heart, Search, Share2, ShoppingCart, SlidersHorizontal, Star, TriangleAlert, Wine, X } from 'lucide-react';
import { CatalogBannerCarousel } from '@/components/catalog/CatalogBannerCarousel';
import { WinePrice } from '@/components/catalog/WinePrice';
import { FlashOfferCountdown } from '@/components/catalog/FlashOfferCountdown';
import { getStockStatus } from '@/lib/catalog/stockStatus';
import { getGrapeClassification } from '@/lib/catalog/grapes';
import type { CatalogBanner } from '@/types/database';

const priceRanges = [
  { label: 'Até R$50', min: 0, max: 50 },
  { label: 'R$50 - R$100', min: 50, max: 100 },
  { label: 'R$100 - R$200', min: 100, max: 200 },
  { label: 'R$200 - R$500', min: 200, max: 500 },
  { label: 'Acima de R$500', min: 500, max: Infinity },
];

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
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedPromotion, setSelectedPromotion] = useState('');
  const [banners, setBanners] = useState<CatalogBanner[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const syncPromotionFromUrl = () => {
      setSelectedPromotion(new URLSearchParams(window.location.search).get('promocao') || '');
    };
    syncPromotionFromUrl();
    window.addEventListener('popstate', syncPromotionFromUrl);

    let active = true;
    fetch('/api/catalogo/promocoes', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (active && Array.isArray(data)) setBanners(data as CatalogBanner[]);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      window.removeEventListener('popstate', syncPromotionFromUrl);
    };
  }, []);

  const types = useMemo(() => [...new Set(wines.map((w) => w.type).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [wines]);
  const grapes = useMemo(() => [...new Set(wines.map((w) => getGrapeClassification(w.grape)).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [wines]);
  const countries = useMemo(() => [...new Set(wines.map((w) => w.category).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [wines]);
  const regions = useMemo(() => [...new Set(wines.map((w) => w.region).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [wines]);
  const promotionSelections = useMemo(() => {
    const selections = new Map<string, { slug: string; title: string; discount: number }>();
    wines.forEach((wine) => {
      if (wine.promotion_slug && wine.promotion_title && wine.discount_percent) {
        selections.set(wine.promotion_slug, {
          slug: wine.promotion_slug,
          title: wine.promotion_title,
          discount: wine.discount_percent,
        });
      }
    });
    return [...selections.values()].sort((a, b) => b.discount - a.discount);
  }, [wines]);
  const standalonePromotionSelections = useMemo(() => {
    const bannerSlugs = new Set(banners.map((banner) => banner.promotion_slug));
    return promotionSelections.filter((selection) => !bannerSlugs.has(selection.slug));
  }, [banners, promotionSelections]);

  const filteredWines = useMemo(() => {
    let result = [...wines];

    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.grape?.toLowerCase().includes(q) ||
          w.region?.toLowerCase().includes(q) ||
          w.category?.toLowerCase().includes(q) ||
          w.type?.toLowerCase().includes(q)
      );
    }

    if (selectedPrice !== null) {
      const range = priceRanges[selectedPrice];
      result = result.filter((w) => w.price >= range.min && w.price < range.max);
    }

    if (selectedType) result = result.filter((w) => w.type === selectedType);
    if (selectedGrape) result = result.filter((w) => getGrapeClassification(w.grape) === selectedGrape);
    if (selectedCountry) result = result.filter((w) => w.category === selectedCountry);
    if (selectedRegion) result = result.filter((w) => w.region === selectedRegion);
    if (selectedPromotion) result = result.filter((w) => w.promotion_slug === selectedPromotion);

    if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') result.sort((a, b) => b.price - a.price);
    else result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return result;
  }, [wines, deferredSearch, sortBy, selectedPrice, selectedType, selectedGrape, selectedCountry, selectedRegion, selectedPromotion]);

  const activeFilterCount = [selectedPrice !== null, selectedType, selectedGrape, selectedCountry, selectedRegion, selectedPromotion, search].filter(Boolean).length;

  const clearFilters = () => {
    setSearch('');
    setSelectedPrice(null);
    setSelectedType('');
    setSelectedGrape('');
    setSelectedCountry('');
    setSelectedRegion('');
    setSelectedPromotion('');
    window.history.replaceState(null, '', '/catalogo');
  };

  const handleSelectPromotion = (slug: string) => {
    setSelectedPromotion(slug);
    const nextUrl = new URL(window.location.href);
    if (slug) nextUrl.searchParams.set('promocao', slug);
    else nextUrl.searchParams.delete('promocao');
    window.history.pushState(null, '', `${nextUrl.pathname}${nextUrl.search}#ofertas`);
    window.setTimeout(() => document.getElementById('ofertas')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  return (
    <PageTransition><main className="min-h-screen bg-brand-bg pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
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
        <div className="mx-auto flex max-w-7xl gap-2 px-4 pb-3 lg:px-8">
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

      <div className="mx-auto max-w-7xl px-4 pt-5 lg:px-8 lg:pt-8">
        <CatalogBannerCarousel banners={banners} onSelectPromotion={handleSelectPromotion} />
      </div>

      {standalonePromotionSelections.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-6 lg:px-8" aria-label="Seleções em promoção">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-primary">Ofertas da casa</p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-stone-950">Seleções com desconto</h2>
            </div>
            {selectedPromotion && (
              <button type="button" onClick={() => handleSelectPromotion('')} className="text-xs font-bold text-stone-500 hover:text-brand-primary">
                Ver todo catálogo
              </button>
            )}
          </div>
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {standalonePromotionSelections.map((selection) => (
              <button
                key={selection.slug}
                type="button"
                onClick={() => handleSelectPromotion(selection.slug)}
                className={`shrink-0 rounded-2xl border px-4 py-3 text-left transition ${selectedPromotion === selection.slug ? 'border-brand-primary bg-brand-primary text-white shadow-lg shadow-red-950/10' : 'border-stone-200 bg-white text-stone-900 hover:border-brand-primary/40'}`}
              >
                <span className="block text-[10px] font-black uppercase tracking-wider opacity-65">Até {selection.discount}% off</span>
                <span className="mt-0.5 block text-sm font-bold">{selection.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}

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
          {selectedCountry && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-bold text-brand-primary">
              {selectedCountry}
              <button type="button" onClick={() => setSelectedCountry('')} className="ml-1" aria-label="Remover filtro de país">×</button>
            </span>
          )}
          {selectedRegion && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-bold text-brand-primary">
              {selectedRegion}
              <button type="button" onClick={() => setSelectedRegion('')} className="ml-1" aria-label="Remover filtro de região">×</button>
            </span>
          )}
          {selectedPromotion && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary px-2.5 py-1 text-xs font-bold text-white">
              {promotionSelections.find((item) => item.slug === selectedPromotion)?.title || 'Promoção'}
              <button onClick={() => handleSelectPromotion('')} className="ml-1" aria-label="Remover filtro de promoção">×</button>
            </span>
          )}
          <button onClick={clearFilters} className="text-xs font-bold text-stone-400 hover:text-brand-primary">
            Limpar filtros
          </button>
        </div>
      )}

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && !search && selectedPrice === null && !selectedType && !selectedGrape && !selectedCountry && !selectedRegion && !selectedPromotion && (
        <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-8">
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
                  <p className="text-[10px] font-bold text-stone-400 uppercase truncate">{wine.type || wine.region}</p>
                  <p className="font-bold text-xs line-clamp-2 mt-0.5">{wine.name}</p>
                  <span className="mt-1 block text-xs"><WinePrice wine={wine} compact /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div id="ofertas" className="mx-auto max-w-7xl scroll-mt-32 px-4 pt-6 lg:px-8">
        {!isLoading && (
          <div className="mb-3 flex items-center justify-between gap-3 text-xs font-bold text-stone-500" role="status" aria-live="polite">
            <span>{filteredWines.length} {filteredWines.length === 1 ? 'vinho encontrado' : 'vinhos encontrados'}</span>
            {activeFilterCount > 0 && <span className="text-brand-primary">Filtros ativos</span>}
          </div>
        )}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 min-[520px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
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
          <div className="grid grid-cols-1 gap-5 min-[520px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {filteredWines.map((wine) => {
              const stock = getStockStatus(wine.stock);
              const StockIcon = stock?.tone === 'danger' ? Ban : TriangleAlert;
              const pixPrice = Number((wine.price * 0.95).toFixed(2));
              const installmentPrice = Number((wine.price / 3).toFixed(2));
              return (
                <article key={wine.id} className="overflow-hidden bg-transparent transition-transform hover:-translate-y-0.5 md:rounded-brand-2xl md:border md:border-[#3c2528] md:bg-white md:shadow-[0_2px_10px_rgba(54,16,24,0.08)]">
                  <Link href={`/catalogo/${wine.id}`} className="block active:scale-[0.99]">
                    <div className="relative md:border-b md:border-stone-100 md:bg-[#fdfbf8]">
                    <ProductImage
                      src={wine.image_url}
                      alt={wine.name}
                      width={300}
                      height={400}
                      sizes="(max-width: 519px) 100vw, (max-width: 768px) 50vw, 320px"
                      className="h-64 w-full object-contain mix-blend-multiply p-3 min-[520px]:h-48 sm:h-56"
                    />
                    {stock && (
                      <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${stock.tone === 'danger' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        <StockIcon className="mr-0.5 inline h-3 w-3 align-[-2px]" aria-hidden="true" />
                        {stock.label}
                      </span>
                    )}
                    {wine.discount_percent && (
                      <span className="absolute right-2 top-2 rounded-md bg-[#d21f2b] px-2.5 py-1 text-[10px] font-black text-white shadow-lg shadow-red-950/20">
                        -{wine.discount_percent}%
                      </span>
                    )}
                    {wine.product_kind === 'kit' && (
                      <span className="absolute left-2 top-2 rounded-md bg-[#c58b31] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white">Kit · {wine.kit_item_count || 0} itens</span>
                    )}
                    </div>
                    <div className="px-3 pb-2 pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{wine.product_kind === 'kit' ? 'Seleção especial' : wine.type || wine.region || 'Vinho'}</p>
                      <h3 className="mt-1 min-h-10 font-serif text-[15px] font-bold leading-5 text-stone-950 line-clamp-2">{wine.name}</h3>
                      <p className="mt-2 flex items-center gap-1 text-[10px] text-stone-400"><span className="flex text-stone-300">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className="h-3 w-3" />)}</span> Sem avaliações</p>
                    </div>
                  </Link>
                  <div className="grid grid-cols-2 text-xs font-medium text-[#741128] md:border-y md:border-stone-200">
                    <button onClick={() => { toggleFavorite(wine); showToast(isFavorite(wine.id) ? 'Removido dos favoritos' : 'Adicionado aos favoritos', 'info'); }} type="button" className="flex min-h-9 items-center justify-center gap-1 hover:bg-[#fdf5f6] md:border-r md:border-stone-200" aria-label={isFavorite(wine.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><Heart className={`h-4 w-4 ${isFavorite(wine.id) ? 'fill-current' : ''}`} />Favoritar</button>
                    <button onClick={() => { if (navigator.share) { void navigator.share({ title: wine.name, url: `${window.location.origin}/catalogo/${wine.id}` }); } else { void navigator.clipboard?.writeText(`${window.location.origin}/catalogo/${wine.id}`); showToast('Link do produto copiado.', 'success'); } }} type="button" className="flex min-h-9 items-center justify-center gap-1 hover:bg-[#fdf5f6]"><Share2 className="h-4 w-4" />Compartilhar</button>
                  </div>
                  <div className="space-y-2 p-3">
                    <WinePrice wine={wine} />
                    <p className="text-[10px] font-bold text-emerald-700">À vista <span className="text-sm font-black">R$ {pixPrice.toFixed(2).replace('.', ',')}</span> no PIX <span className="rounded bg-emerald-600 px-1 py-0.5 text-[9px] text-white">5% OFF</span></p>
                    <p className="text-[10px] font-medium text-stone-600">ou 3x de R$ {installmentPrice.toFixed(2).replace('.', ',')} sem juros</p>
                    {wine.show_countdown && <FlashOfferCountdown endsAt={wine.promotion_ends_at} />}
                    <button onClick={() => { if (wine.stock > 0) { addToCart(wine); showToast(`${wine.product_kind === 'kit' ? 'Kit' : 'Vinho'} adicionado ao carrinho!`, 'success'); } }} type="button" disabled={wine.stock === 0} className="mt-1 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#82c341] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#6eae31] disabled:cursor-not-allowed disabled:opacity-40"><ShoppingCart className="h-4 w-4" />{wine.stock === 0 ? 'Indisponível' : 'Adicionar ao carrinho'}</button>
                  </div>
                </article>
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
                {promotionSelections.length > 0 && (
                  <div className="mb-6">
                    <p className="mb-3 text-xs font-bold uppercase text-stone-400">Promoções</p>
                    <div className="flex flex-wrap gap-2">
                      {promotionSelections.map((selection) => (
                        <button
                          key={selection.slug}
                          onClick={() => handleSelectPromotion(selectedPromotion === selection.slug ? '' : selection.slug)}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${selectedPromotion === selection.slug ? 'border-brand-primary bg-brand-primary text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-brand-primary'}`}
                        >
                          {selection.title} · -{selection.discount}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="mb-3 text-xs font-bold uppercase text-stone-400">Faixa de preço</p>
                <div className="flex flex-wrap gap-2">
                  {priceRanges.map((range, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPrice(selectedPrice === i ? null : i)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        selectedPrice === i
                          ? 'border-brand-primary bg-brand-primary text-white'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-brand-primary'
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
                          ? 'border-brand-primary bg-brand-primary text-white'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-brand-primary'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase mb-3">Uva</p>
                <p className="mb-3 text-xs text-stone-500">Vinhos com duas ou mais uvas aparecem como Blend.</p>
                <div className="flex flex-wrap gap-2">
                  {grapes.map((grape) => (
                    <button
                      key={grape}
                      onClick={() => setSelectedGrape(selectedGrape === grape ? '' : grape)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        selectedGrape === grape
                          ? 'border-brand-primary bg-brand-primary text-white'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-brand-primary'
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
                  {countries.map((country) => (
                    <button
                      key={country}
                      onClick={() => setSelectedCountry(selectedCountry === country ? '' : country)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        selectedCountry === country
                          ? 'border-brand-primary bg-brand-primary text-white'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-brand-primary'
                      }`}
                    >
                      {country}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-bold uppercase text-stone-400">Região</p>
                <div className="flex flex-wrap gap-2">
                  {regions.map((region) => (
                    <button
                      key={region}
                      onClick={() => setSelectedRegion(selectedRegion === region ? '' : region)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        selectedRegion === region
                          ? 'border-brand-primary bg-brand-primary text-white'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-brand-primary'
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
      <footer className="mx-auto mt-16 max-w-7xl border-t border-brand-border px-4 pb-12 pt-10 lg:px-8">
        <div className="max-w-3xl space-y-7 text-sm leading-7 text-brand-ink-light">
          <section>
            <h2 className="mb-3 font-serif text-xl font-bold text-brand-ink">Sobre a Allvino</h2>
            <p>Somos importadores de vinhos e trabalhamos com marcas exclusivas e não exclusivas. Atendemos os segmentos de atacado (B2B) e varejo (B2C) com representantes, lojas online e física, além do nosso espaço gastronômico para levar o máximo de experiência aos nossos clientes.</p>
          </section>
          <section>
            <h2 className="mb-3 font-serif text-xl font-bold text-brand-ink">Compre online</h2>
            <p>Compre online com pagamento no checkout e receba em seu endereço ou retire em nossa loja.</p>
          </section>
          <section>
            <h2 className="mb-3 font-serif text-xl font-bold text-brand-ink">Nossa localização</h2>
            <address className="not-italic">Rua Goiânia, 339 - Itapuã, Vila Velha - ES, 29101-780</address>
          </section>
        </div>
      </footer>
    </main></PageTransition>
  );
}
