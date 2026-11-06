import { describe, expect, it } from 'vitest';
import { createCatalogXlsx, parsePricingRows } from '@/lib/catalog/pricingImport';

describe('pricing import', () => {
  it('parses Brazilian DE/POR prices using descriptive headers', () => {
    expect(parsePricingRows([
      { 'Código do Produto': 'sku-001', 'Preço DE': 'R$ 1.250,00', 'Preço POR': '999,90' },
      { Código: 1002, 'Preço DE': 89.5, 'Preço POR': '' },
      { Código: '1003', 'Preço DE': '1.250', 'Preço POR': '1.000' },
    ])).toEqual([
      { product_code: 'SKU-001', price_from: 1250, price_to: 999.9 },
      { product_code: '1002', price_from: 89.5, price_to: null },
      { product_code: '1003', price_from: 1250, price_to: 1000 },
    ]);
  });

  it('rejects repeated codes and invalid promotional prices', () => {
    expect(() => parsePricingRows([
      { Código: '1001', 'Preço DE': '50', 'Preço POR': '50' },
    ])).toThrow('Preço POR');
    expect(() => parsePricingRows([
      { Código: '1001', 'Preço DE': '50' },
      { Código: '1001', 'Preço DE': '60' },
    ])).toThrow('aparece mais de uma vez');
  });
});

describe('catalog spreadsheet export', () => {
  it('creates a valid XLSX workbook with DE, POR and stock columns', async () => {
    const workbook = createCatalogXlsx([
      { product_code: '1001', name: 'Reserva Especial', original_price: 100, price: 80, stock: 6 },
      { product_code: '=danger', name: '=formula', original_price: 50, price: 50, stock: 0 },
    ]);
    const content = new TextDecoder().decode(workbook);
    expect(Array.from(workbook.slice(0, 2))).toEqual([0x50, 0x4b]);
    expect(content).toContain('Preço DE');
    expect(content).toContain('Preço POR');
    expect(content).toContain('Estoque');
    expect(content).toContain('&apos;=formula');
    expect(content).toContain('<v>100</v>');
    expect(content).toContain('<v>80</v>');
    expect(content).toContain('<v>6</v>');
  });
});
