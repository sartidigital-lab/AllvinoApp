export type StockStatus = {
  label: string;
  description: string;
  tone: 'danger';
};

export function getStockStatus(stock: number): StockStatus | null {
  if (stock <= 0) {
    return { label: 'Indisponível', description: 'Este produto está indisponível.', tone: 'danger' };
  }

  return null;
}
