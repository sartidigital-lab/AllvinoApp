import { describe, expect, it } from 'vitest';
import { getGrapeClassification, parseGrapes, serializeGrapes } from '@/lib/catalog/grapes';
import { formatProductDescription, formatProductText } from '@/lib/catalog/productText';

describe('catalog product metadata', () => {
  it('normalizes product-facing text without touching product codes', () => {
    expect(formatProductText('  VINHO   TINTO  RESERVA ')).toBe('Vinho Tinto Reserva');
    expect(formatProductText('vale   dos vinhedos')).toBe('Vale dos Vinhedos');
    expect(formatProductDescription('  VINHO COMPLETO E ELEGANTE. ')).toBe('Vinho completo e elegante.');
  });

  it('stores grapes as tags and classifies multiple grapes as a blend', () => {
    expect(parseGrapes('Cabernet Sauvignon, Merlot; cabernet sauvignon')).toEqual(['Cabernet Sauvignon', 'Merlot']);
    expect(serializeGrapes(['Merlot', 'Cabernet Sauvignon', 'Merlot'])).toBe('Merlot, Cabernet Sauvignon');
    expect(getGrapeClassification('Malbec')).toBe('Malbec');
    expect(getGrapeClassification('Cabernet Sauvignon, Merlot')).toBe('Blend');
  });
});
