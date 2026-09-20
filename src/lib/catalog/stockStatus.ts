export type StockStatus = {
  label: string;
  description: string;
  tone: 'danger' | 'warning';
};

export function getStockStatus(stock: number): StockStatus | null {
  if (stock <= 0) {
    return { label: 'Esgotado', description: 'Este vinho está esgotado.', tone: 'danger' };
  }

  if (stock < 20) {
    return {
      label: stock === 1 ? 'Última garrafa' : `Últimas ${stock} garrafas`,
      description: 'Últimas unidades disponíveis.',
      tone: 'warning',
    };
  }

  return null;
}
