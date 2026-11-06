import { describe, expect, it } from 'vitest';
import { formatCatalogDiscountPercent, getKitUnitPrice } from '@/components/catalog/WinePrice';

describe('customer discount display', () => {
  it('truncates a fractional percentage instead of showing or rounding it up', () => {
    expect(formatCatalogDiscountPercent(32.9)).toBe(32);
    expect(formatCatalogDiscountPercent(32.5)).toBe(32);
  });
});

describe('kit unit price', () => {
  it('calculates the displayed unit price from the kit total', () => {
    expect(getKitUnitPrice(297.33, 2)).toBe(148.67);
    expect(getKitUnitPrice(716.20, 6)).toBe(119.37);
  });

  it('does not invent a unit price without a valid number of bottles', () => {
    expect(getKitUnitPrice(297.33, 0)).toBeNull();
    expect(getKitUnitPrice(297.33, null)).toBeNull();
  });
});
