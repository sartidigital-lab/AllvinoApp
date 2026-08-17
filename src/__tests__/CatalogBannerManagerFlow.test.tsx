import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogBannerManager } from '@/components/admin/CatalogBannerManager';
import type { CatalogBanner, ProductPromotionCampaign } from '@/types/database';

const mocks = vi.hoisted(() => ({
  fetchBanners: vi.fn(),
  fetchCampaigns: vi.fn(),
  saveBanner: vi.fn(),
  deleteBanner: vi.fn(),
}));

vi.mock('@/lib/database/catalogPromotions', () => ({
  fetchCatalogBanners: mocks.fetchBanners,
  fetchProductPromotionCampaigns: mocks.fetchCampaigns,
  saveCatalogBanner: mocks.saveBanner,
  deleteCatalogBanner: mocks.deleteBanner,
}));

const campaign: ProductPromotionCampaign = {
  id: 'campaign-1',
  created_at: '2026-08-17T00:00:00.000Z',
  updated_at: '2026-08-17T00:00:00.000Z',
  title: 'Indicação da Semana',
  slug: 'indicacao-da-semana',
  description: null,
  discount_percent: 10,
  starts_at: '2026-08-16T23:59:00.000Z',
  ends_at: '2026-08-24T23:59:00.000Z',
  is_active: true,
  product_ids: ['product-1'],
};

const savedBanner: CatalogBanner = {
  id: 'banner-1',
  created_at: '2026-08-17T00:10:00.000Z',
  updated_at: '2026-08-17T00:10:00.000Z',
  promotion_id: campaign.id,
  promotion_title: campaign.title,
  promotion_slug: campaign.slug,
  discount_percent: campaign.discount_percent,
  eyebrow: null,
  title: campaign.title,
  subtitle: null,
  cta_label: 'Ver seleção',
  image_url: null,
  mobile_image_url: null,
  image_alt: null,
  theme: 'wine',
  show_text: true,
  show_cta: true,
  show_discount_badge: true,
  sort_order: 0,
  starts_at: campaign.starts_at,
  ends_at: campaign.ends_at,
  is_active: true,
};

describe('CatalogBannerManager creation flow', () => {
  beforeEach(() => {
    mocks.fetchBanners.mockResolvedValue({ banners: [], error: null });
    mocks.fetchCampaigns.mockResolvedValue({ campaigns: [campaign], error: null });
    mocks.saveBanner.mockResolvedValue({ banner: savedBanner, error: null });
  });

  it('prefills the required name and persists every optional overlay choice', async () => {
    const user = userEvent.setup();
    render(<CatalogBannerManager />);

    const newBannerButton = await screen.findByRole('button', { name: 'Novo banner' });
    await waitFor(() => expect(newBannerButton).toBeEnabled());
    await user.click(newBannerButton);

    expect(screen.getByRole('textbox', { name: /Nome interno do banner/ })).toHaveValue(campaign.title);

    await user.click(screen.getByRole('checkbox', { name: 'Exibir textos' }));
    await user.click(screen.getByRole('checkbox', { name: 'Exibir botão' }));
    await user.click(screen.getByRole('checkbox', { name: 'Exibir desconto' }));
    await user.click(screen.getByRole('button', { name: 'Salvar banner' }));

    await waitFor(() => expect(mocks.saveBanner).toHaveBeenCalledTimes(1));
    expect(mocks.saveBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: campaign.title,
        promotion_id: campaign.id,
        show_text: true,
        show_cta: true,
        show_discount_badge: true,
      }),
      undefined
    );
  });
});
