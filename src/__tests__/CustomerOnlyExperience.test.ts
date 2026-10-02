import { describe, expect, it } from 'vitest';
import { isAdminRoute } from '@/components/layout/CustomerOnlyExperience';

describe('customer-only experience routes', () => {
  it('removes customer overlays from every admin route', () => {
    expect(isAdminRoute('/admin')).toBe(true);
    expect(isAdminRoute('/admin/pedidos')).toBe(true);
  });

  it('keeps customer overlays on public routes', () => {
    expect(isAdminRoute('/catalogo')).toBe(false);
    expect(isAdminRoute('/catalogo/produto-1')).toBe(false);
    expect(isAdminRoute(null)).toBe(false);
  });
});
