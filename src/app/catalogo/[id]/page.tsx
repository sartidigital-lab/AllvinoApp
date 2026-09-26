"use client";

import { Suspense, useEffect, useState } from 'react';
import { useWine, useWines } from '@/hooks/useWines';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import { ProductImage, WineDetailSkeleton } from '@/components/ui';
import { useParams } from 'next/navigation';
import { ArrowLeft, Ban, Grape, Heart, MapPin, ShoppingCart, TriangleAlert, Truck, Wine, type LucideIcon } from 'lucide-react';
import { getStockStatus } from '@/lib/catalog/stockStatus';
import { getGrapeClassification, parseGrapes } from '@/lib/catalog/grapes';
import { fetchDeliveryQuote } from '@/lib/database/delivery';
import { formatZipCode, normalizeZipCode } from '@/lib/delivery/rules';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function productAttribute(Icon: LucideIcon, label: string, value: string) {
  return (
    <div className="bg-stone-50 border border-stone-100 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />
        <span className="text-[10px] font-bold text-stone-400 uppercase">{label}</span>
      </div>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}

function getWhatsAppShareUrl(wine: { name: string; type?: string | null; category?: string | null; region?: string | null; price: number }) {
  const subtitle = [wine.type || wine.category || '', wine.region || ''].filter(Boolean).join(' · ');
  const lines = [
    'Confira este vinho na Allvino!',
    '',
    wine.name,
    ...(subtitle ? [subtitle] : []),
    '',
    formatMoney(wine.price),
    '',
    window.location.href,
  ];
  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`;
}

export default function WineDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { wine, isLoading, error } = useWine(id);
  const { wines } = useWines();
  const { addToCart, setIsCartOpen } = useCart();
  const { showToast } = useToast();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { trackView } = useRecentlyViewed();
  const [deliveryZip, setDeliveryZip] = useState('');
  const [deliveryQuote, setDeliveryQuote] = useState<string | null>(null);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);

  useEffect(() => {
    if (wine) trackView(wine);
  }, [wine, trackView]);

  if (isLoading) return <WineDetailSkeleton />;

  if (error || !wine) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <Wine className="h-16 w-16 text-stone-200" aria-hidden="true" />
        <p className="mt-4 text-lg font-bold">Vinho não encontrado</p>
        <a href="/catalogo" className="mt-4 text-sm font-bold text-brand-primary">
          Voltar ao catálogo
        </a>
      </div>
    );
  }

  const stock = getStockStatus(wine.stock);
  const StockIcon = stock?.tone === 'danger' ? Ban : TriangleAlert;
  const grapeClassification = getGrapeClassification(wine.grape);
  const grapes = parseGrapes(wine.grape);

  const relatedWines = wines
    .filter((w) => w.id !== wine.id && (w.type === wine.type || w.region === wine.region || w.category === wine.category || w.grape === wine.grape))
    .slice(0, 3);

  const handleCalculateDelivery = async () => {
    const zipCode = normalizeZipCode(deliveryZip);
    if (zipCode.length !== 8) {
      setDeliveryQuote('Informe um CEP com 8 dígitos.');
      return;
    }
    setIsCalculatingDelivery(true);
    setDeliveryQuote(null);
    const { zone, shippingFee, error } = await fetchDeliveryQuote(zipCode, wine.price);
    if (error) setDeliveryQuote('Não foi possível calcular o frete agora.');
    else if (!zone) setDeliveryQuote('Ainda não entregamos neste CEP.');
    else {
      setDeliveryZip(formatZipCode(zipCode));
      setDeliveryQuote(`${zone.name}: ${shippingFee === 0 ? 'frete grátis' : `frete ${formatMoney(shippingFee)}`} em até ${zone.estimate_days} dia(s).`);
    }
    setIsCalculatingDelivery(false);
  };

  return (
    <main className="min-h-screen bg-brand-bg pb-24">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="flex items-center px-4 py-3">
          <a href="/catalogo" aria-label="Voltar ao catálogo" className="rounded-full p-2 hover:bg-stone-100 transition">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </a>
          <p className="ml-2 font-bold text-sm truncate">{wine.name}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_420px] gap-8">
          <div className="surface-card flex items-center justify-center p-8">
            <ProductImage src={wine.image_url} alt={wine.name} width={600} height={800} priority sizes="(max-width: 1024px) 100vw, 60vw" className="w-full max-h-[500px] object-contain mix-blend-multiply" />
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                {wine.category || wine.type} · {wine.region || 'Região não informada'}
              </p>
              <h1 className="font-serif text-3xl font-bold mt-2">{wine.name}</h1>
              {wine.description && (
                <p className="mt-3 text-stone-500 text-sm leading-relaxed">{wine.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {wine.type && productAttribute(Wine, 'Tipo', wine.type)}
              {grapeClassification && productAttribute(Grape, grapeClassification === 'Blend' ? 'Estilo' : 'Uva', grapeClassification)}
              {wine.region && productAttribute(MapPin, 'Região', wine.region)}
              {wine.category && productAttribute(MapPin, 'País', wine.category)}
            </div>
            {grapeClassification === 'Blend' && grapes.length > 0 && (
              <p className="text-xs font-medium text-stone-500">Uvas: {grapes.join(', ')}</p>
            )}

            <div className="border-t border-stone-100 pt-6">
              {wine.discount_percent && (
                <span className="mb-2 inline-flex rounded-full bg-brand-primary px-3 py-1 text-xs font-black text-white">
                  {wine.discount_percent}% OFF · {wine.promotion_title}
                </span>
              )}
              {wine.discount_percent && wine.base_price && wine.base_price > wine.price && (
                <p className="text-sm font-bold text-stone-400 line-through">{formatMoney(wine.base_price)}</p>
              )}
              <p className="text-3xl font-bold text-brand-primary">{formatMoney(wine.price)}</p>
              <p className="mt-1 text-xs text-stone-400">Preço para pedidos online</p>
            </div>

            {stock && (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
                <StockIcon className="h-5 w-5" aria-hidden="true" />
                <div>
                  <p className="font-bold text-sm">{stock.label}</p>
                  <p className="text-xs opacity-70">{stock.description}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { toggleFavorite(wine); showToast(isFavorite(wine.id) ? 'Removido dos favoritos' : 'Adicionado aos favoritos', 'info'); }}
                type="button"
                aria-label={isFavorite(wine.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition ${isFavorite(wine.id) ? 'bg-red-50 border-red-200' : 'bg-white border-stone-200 hover:border-brand-primary'}`}
              >
                <Heart className={`h-6 w-6 ${isFavorite(wine.id) ? 'fill-current text-brand-primary' : 'text-stone-400'}`} aria-hidden="true" />
              </button>
              <a
                href={getWhatsAppShareUrl(wine)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no WhatsApp"
                className="w-14 h-14 rounded-2xl border border-stone-200 bg-white flex items-center justify-center hover:border-green-500 transition"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-600">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => { addToCart(wine); setIsCartOpen(true); }}
                type="button"
                disabled={wine.stock === 0}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-brand-2xl bg-[#82c341] px-5 text-lg font-bold text-white shadow-lg shadow-lime-900/15 transition hover:bg-[#6eae31] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {wine.stock === 0 ? 'Indisponível' : 'Comprar'}
              </button>
              <button
                onClick={() => { addToCart(wine); showToast('Item adicionado. Ajuste a quantidade no carrinho quando quiser.', 'success'); }}
                type="button"
                disabled={wine.stock === 0}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-brand-xl bg-brand-primary px-5 text-base font-bold text-white shadow-lg shadow-red-900/15 transition hover:bg-brand-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                Adicionar ao carrinho
              </button>
            </div>
            <section className="rounded-brand-xl border border-stone-200 bg-white p-4" aria-labelledby="delivery-calculator-title">
              <div className="flex items-center gap-2"><Truck className="h-5 w-5 text-brand-primary" aria-hidden="true" /><h2 id="delivery-calculator-title" className="font-bold text-stone-900">Calcule frete e prazo</h2></div>
              <form onSubmit={(event) => { event.preventDefault(); void handleCalculateDelivery(); }} className="mt-3 flex gap-2">
                <label className="sr-only" htmlFor="product-delivery-zip">CEP</label>
                <input id="product-delivery-zip" inputMode="numeric" autoComplete="postal-code" value={deliveryZip} onChange={(event) => setDeliveryZip(formatZipCode(event.target.value))} placeholder="00000-000" className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-brand-primary" />
                <button type="submit" disabled={isCalculatingDelivery} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-700 disabled:opacity-50">{isCalculatingDelivery ? 'Calculando...' : 'Calcular'}</button>
              </form>
              {deliveryQuote && <p role="status" className="mt-3 text-xs font-semibold text-stone-600">{deliveryQuote}</p>}
            </section>
            <aside className="rounded-brand-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" /><div><p className="font-bold text-emerald-950">Retire na loja e ganhe <span className="text-emerald-700">5% de desconto</span></p><p className="mt-1 text-xs font-bold text-emerald-800">Comprando até às 19h30</p><address className="mt-2 not-italic text-xs leading-5 text-emerald-950/80">Rua Goiânia, 339 - Itapuã, Vila Velha - ES, 29101-780</address></div></div>
            </aside>
            <a href="/catalogo" className="block text-center text-sm font-bold text-stone-400 hover:text-brand-primary transition">
              Continuar comprando
            </a>
          </div>
        </div>

        {relatedWines.length > 0 && (
          <div className="mt-12">
            <h2 className="font-serif text-xl font-bold mb-4">Você também pode gostar</h2>
            <div className="grid grid-cols-3 gap-4">
              {relatedWines.map((w) => (
                <a key={w.id} href={`/catalogo/${w.id}`} className="surface-card p-4 text-center active:scale-[0.98] transition-transform">
                  <ProductImage src={w.image_url} alt={w.name} width={300} height={400} sizes="(max-width: 768px) 33vw, 220px" className="mb-2 h-28 w-full object-contain mix-blend-multiply" />
                  <p className="font-bold text-xs line-clamp-2">{w.name}</p>
              <p className="mt-1 text-xs font-bold text-brand-primary">{formatMoney(w.price)}</p>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
