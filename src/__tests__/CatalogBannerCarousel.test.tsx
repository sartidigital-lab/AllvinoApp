import { render, screen } from '@testing-library/react';
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
  sort_order: 0,
  starts_at: null,
  ends_at: null,
  is_active: true,
};

describe('CatalogBannerCarousel', () => {
  it('uses the mobile image as a fallback when no desktop image was uploaded', () => {
    render(<CatalogBannerCarousel banners={[mobileOnlyBanner]} onSelectPromotion={vi.fn()} />);

    expect(screen.getByRole('img', { name: 'Arte da indicação da semana' })).toHaveAttribute(
      'src',
      mobileOnlyBanner.mobile_image_url,
    );
  });
});
