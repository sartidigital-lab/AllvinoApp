"use client";

import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCatalogDiscountPercent } from '@/components/catalog/WinePrice';
import type { CatalogBanner, CatalogBannerTheme } from '@/types/database';

const themes: Record<CatalogBannerTheme, string> = {
  wine: 'from-[#2A090D] via-[#701824] to-[#C14B3D]',
  gold: 'from-[#4A2D0B] via-[#A86F20] to-[#E8B95F]',
  forest: 'from-[#102D24] via-[#225E49] to-[#75A987]',
};

export function CatalogBannerCarousel({
  banners,
  onSelectPromotion,
}: {
  banners: CatalogBanner[];
  onSelectPromotion: (slug: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (activeIndex >= banners.length) setActiveIndex(0);
  }, [activeIndex, banners.length]);

  useEffect(() => {
    if (banners.length < 2 || isPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % banners.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [banners.length, isPaused]);

  if (banners.length === 0) return null;
  const safeIndex = Math.min(activeIndex, banners.length - 1);
  const activeBanner = banners[safeIndex];
  const fallbackImageUrl = activeBanner.image_url || activeBanner.mobile_image_url;
  const hasArtwork = Boolean(fallbackImageUrl);
  const hasOverlayContent = activeBanner.show_text || activeBanner.show_cta;
  const needsMobileCaption = !activeBanner.mobile_image_url && hasArtwork;

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques do catálogo"
      className="relative overflow-hidden rounded-[28px] shadow-[0_24px_70px_-30px_rgba(42,9,13,0.7)]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className={`relative overflow-hidden ${hasArtwork ? 'bg-stone-950' : `min-h-44 bg-gradient-to-br ${themes[activeBanner.theme]}`} sm:min-h-[300px] md:min-h-[360px]`}>
        {fallbackImageUrl && (
          <picture>
            {activeBanner.mobile_image_url && <source media="(max-width: 639px)" srcSet={activeBanner.mobile_image_url} />}
            <img
              src={fallbackImageUrl}
              alt={activeBanner.image_alt || ''}
              className="block aspect-[16/9] max-h-56 w-full object-contain sm:absolute sm:inset-0 sm:aspect-auto sm:h-full sm:max-h-none sm:object-cover"
            />
          </picture>
        )}
        {hasOverlayContent && <div className="absolute inset-0 hidden bg-gradient-to-r from-black/60 via-black/15 to-transparent sm:block" aria-hidden="true" />}
        <button
          type="button"
          onClick={() => onSelectPromotion(activeBanner.promotion_slug)}
          className={`absolute inset-0 z-[5] cursor-pointer focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-white ${activeBanner.show_cta || needsMobileCaption ? 'hidden sm:block' : ''}`}
          aria-label={`Abrir promoção ${activeBanner.promotion_title}`}
        />
        {(hasOverlayContent || needsMobileCaption) && (
          <div className={`pointer-events-none relative z-10 flex max-w-2xl flex-col justify-end p-4 text-white sm:min-h-[300px] sm:p-9 md:min-h-[360px] md:justify-center md:p-12 ${hasOverlayContent ? '' : 'sm:hidden'}`}>
            {activeBanner.show_text ? (
              <>
                {activeBanner.eyebrow && <p className="mb-3 text-[11px] font-black uppercase tracking-[0.28em] text-white/70">{activeBanner.eyebrow}</p>}
                <h2 className="max-w-xl font-serif text-3xl font-bold leading-[0.98] sm:text-4xl md:text-5xl">{activeBanner.title}</h2>
                {activeBanner.subtitle && <p className="mt-4 max-w-lg text-sm font-medium leading-6 text-white/80 sm:text-base">{activeBanner.subtitle}</p>}
              </>
            ) : needsMobileCaption && (
              <p className="font-serif text-lg font-bold sm:hidden">{activeBanner.promotion_title}</p>
            )}
            {(activeBanner.show_cta || needsMobileCaption) && (
              <button
                type="button"
                onClick={() => onSelectPromotion(activeBanner.promotion_slug)}
                className={`pointer-events-auto mt-2 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#2A090D] transition hover:translate-x-1 sm:mt-6 sm:px-5 sm:py-3 ${activeBanner.show_cta ? '' : 'sm:hidden'}`}
              >
                {activeBanner.show_cta ? activeBanner.cta_label : 'Ver ofertas'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        {activeBanner.show_discount_badge && (
          <div className="absolute right-5 top-5 z-10 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-black text-white backdrop-blur-md">
            -{formatCatalogDiscountPercent(activeBanner.discount_percent)}%
          </div>
        )}
      </div>

      {banners.length > 1 && (
        <div className="relative z-20 flex items-center justify-end gap-2 bg-stone-950 px-4 pb-3 pt-1 sm:absolute sm:bottom-4 sm:right-4 sm:bg-transparent sm:p-0">
          <button
            type="button"
            onClick={() => setActiveIndex((safeIndex - 1 + banners.length) % banners.length)}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur-md transition hover:bg-black/45"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-12 text-center text-xs font-black text-white">
            {safeIndex + 1} / {banners.length}
          </span>
          <button
            type="button"
            onClick={() => setActiveIndex((safeIndex + 1) % banners.length)}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur-md transition hover:bg-black/45"
            aria-label="Próximo banner"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
