import { describe, expect, it } from 'vitest';
import { parseCsvRows } from '@/lib/stock/importFile';
import { parseStockRows } from '@/lib/database/stock';

describe('parseCsvRows', () => {
  it('reads comma-delimited CSV with quoted values', () => {
    expect(parseCsvRows('Código,Estoque,Produto\n1001,8,"Vinho, Reserva"')).toEqual([
      { Código: '1001', Estoque: '8', Produto: 'Vinho, Reserva' },
    ]);
  });

  it('reads semicolon-delimited CSV exported by Brazilian Excel', () => {
    expect(parseCsvRows('Código;Estoque;Produto\n1002;12;Vinho Branco')).toEqual([
      { Código: '1002', Estoque: '12', Produto: 'Vinho Branco' },
    ]);
  });
});

describe('parseStockRows', () => {
  it('recognizes descriptive headers from the Mercos Excel export', () => {
    expect(parseStockRows([
      {
        'Código do produto\r\n(recomendado)': 14847,
        'Quantidade em estoque\r\n(opcional - preencha com um número maior ou igual a 0)': 11,
      },
    ])).toEqual([{ product_code: '14847', quantity: 11 }]);
  });
});
