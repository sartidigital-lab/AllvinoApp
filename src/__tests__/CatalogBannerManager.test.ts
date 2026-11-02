import { describe, expect, it } from 'vitest';
import { createBannerForm } from '@/components/admin/CatalogBannerManager';
import type { ProductPromotionCampaign } from '@/types/database';

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

describe('createBannerForm', () => {
  it('prefills the required banner identity and schedule from its campaign', () => {
    const form = createBannerForm(campaign);

    expect(form.promotion_id).toBe(campaign.id);
    expect(form.title).toBe(campaign.title);
    expect(form.starts_at).not.toBe('');
    expect(form.ends_at).not.toBe('');
    expect(form.image_url).toBe('');
    expect(form.mobile_image_url).toBe('');
  });
});
