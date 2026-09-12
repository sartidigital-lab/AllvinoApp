import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CatalogBannerCarousel } from '@/components/catalog/CatalogBannerCarousel';
import type { CatalogBanner } from '@/types/database';

const mobileOnlyBanner: CatalogBanner = {
  id: 'banner-1',
  created_at: '2026-08-16T00:00:00.000Z',
  updated_at: '2026-08-16T00:00:00.000Z',
  promotion_id: 'promotion-1',
  promotion_title: 'Indicação da semana',
  promotion_slug: 'indicacao-da-semana',
  discount_percent: 15,
  eyebrow: 'Curadoria Allvino',
  title: 'Indicação da semana',
  subtitle: 'Seleção especial',
  cta_label: 'Ver seleção',
  image_url: null,
  mobile_image_url: 'https://example.com/banner-mobile.webp',
  image_alt: 'Arte da indicação da semana',
  theme: 'wine',
  show_text: false,
  show_cta: false,
  show_discount_badge: false,
  sort_order: 0,
  starts_at: null,
  ends_at: null,
  is_active: true,
};

describe('CatalogBannerCarousel', () => {
  it('uses the mobile image as a fallback when no desktop image was uploaded', () => {
    const onSelectPromotion = vi.fn();
    render(<CatalogBannerCarousel banners={[mobileOnlyBanner]} onSelectPromotion={onSelectPromotion} />);

    expect(screen.getByRole('img', { name: 'Arte da indicação da semana' })).toHaveAttribute(
      'src',
      mobileOnlyBanner.mobile_image_url,
    );
    expect(screen.queryByRole('heading', { name: mobileOnlyBanner.title })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: mobileOnlyBanner.cta_label })).not.toBeInTheDocument();
    expect(screen.queryByText(`-${mobileOnlyBanner.discount_percent}%`)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: `Abrir promoção ${mobileOnlyBanner.promotion_title}` }));
    expect(onSelectPromotion).toHaveBeenCalledWith(mobileOnlyBanner.promotion_slug);
  });

  it('renders each optional overlay only when it is enabled', () => {
    const bannerWithOverlays = {
      ...mobileOnlyBanner,
      show_text: true,
      show_cta: true,
      show_discount_badge: true,
    };

    render(<CatalogBannerCarousel banners={[bannerWithOverlays]} onSelectPromotion={vi.fn()} />);

    expect(screen.getByRole('heading', { name: bannerWithOverlays.title })).toBeVisible();
    expect(screen.getByRole('button', { name: bannerWithOverlays.cta_label })).toBeVisible();
    expect(screen.getByText(`-${bannerWithOverlays.discount_percent}%`)).toBeVisible();
  });
});
