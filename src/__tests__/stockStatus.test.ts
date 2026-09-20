import { describe, expect, it } from 'vitest';
import { getStockStatus } from '@/lib/catalog/stockStatus';

describe('catalog stock status', () => {
  it('hides stock totals of 20 bottles or more', () => {
    expect(getStockStatus(20)).toBeNull();
    expect(getStockStatus(450)).toBeNull();
  });

  it('shows remaining bottles below 20', () => {
    expect(getStockStatus(15)?.label).toBe('Últimas 15 garrafas');
    expect(getStockStatus(1)?.label).toBe('Última garrafa');
  });

  it('marks unavailable wines as sold out', () => {
    expect(getStockStatus(0)?.label).toBe('Esgotado');
  });
});
