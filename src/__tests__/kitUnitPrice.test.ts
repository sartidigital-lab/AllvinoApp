import { describe, expect, it } from 'vitest';
import { getKitUnitPrice } from '@/components/catalog/WinePrice';

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
