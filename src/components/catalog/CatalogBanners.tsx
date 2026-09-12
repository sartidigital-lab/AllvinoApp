"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type PublicCatalogBanner = {
  id: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  cta_label: string;
  cta_text_color: string;
  image_url: string;
  mobile_image_url: string | null;
  image_alt: string | null;
  show_text: boolean;
  show_cta: boolean;
  show_discount_badge: boolean;
  promotion: { slug: string; title: string; discount_percent: number };
};

export default function CatalogBanners() {
  const [banners, setBanners] = useState<PublicCatalogBanner[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/catalogo/promocoes', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : [])
      .then((data) => { if (active && Array.isArray(data)) setBanners(data); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  if (banners.length === 0) return null;

  return (
    <section aria-label="Campanhas em destaque" className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pt-4 scrollbar-hide">
      {banners.map((banner, index) => (
        <Link
          key={banner.id}
          href={`/catalogo?promocao=${encodeURIComponent(banner.promotion.slug)}#produtos-promocao`}
          className="relative aspect-[9/10] min-w-full snap-center overflow-hidden rounded-3xl bg-black shadow-sm md:aspect-[3/1]"
          aria-label={`${banner.title}: ver produtos com ${banner.promotion.discount_percent}% de desconto`}
        >
          <Image
            src={banner.mobile_image_url || banner.image_url}
            alt={banner.image_alt || banner.title}
            fill
            priority={index === 0}
            sizes="100vw"
            className="object-cover md:hidden"
          />
          <Image
            src={banner.image_url}
            alt=""
            fill
            priority={index === 0}
            sizes="(min-width: 768px) 100vw, 1px"
            className="hidden object-cover md:block"
          />
          <div className="absolute inset-0 flex flex-col items-start justify-end gap-2 p-6 text-white md:max-w-xl md:justify-center md:p-10">
            {banner.show_discount_badge && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-brand-primary shadow-sm">
                {banner.promotion.discount_percent}% OFF
              </span>
            )}
            {banner.show_text && (
              <>
                {banner.eyebrow && <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">{banner.eyebrow}</span>}
                <h2 className="font-serif text-3xl font-bold leading-tight md:text-4xl">{banner.title}</h2>
                {banner.subtitle && <p className="max-w-md text-sm font-medium text-white/85 md:text-base">{banner.subtitle}</p>}
              </>
            )}
            {banner.show_cta && (
              <span className="mt-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold shadow-sm" style={{ color: banner.cta_text_color || 'var(--color-ink)' }}>
                {banner.cta_label}
              </span>
            )}
          </div>
        </Link>
      ))}
    </section>
  );
}
