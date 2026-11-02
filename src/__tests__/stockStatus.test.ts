import { describe, expect, it } from 'vitest';
import { getStockStatus } from '@/lib/catalog/stockStatus';

describe('catalog stock status', () => {
  it('hides all positive stock totals', () => {
    expect(getStockStatus(1)).toBeNull();
    expect(getStockStatus(15)).toBeNull();
    expect(getStockStatus(20)).toBeNull();
    expect(getStockStatus(450)).toBeNull();
  });

  it('marks unavailable wines as unavailable', () => {
    expect(getStockStatus(0)?.label).toBe('Indisponível');
  });
});
