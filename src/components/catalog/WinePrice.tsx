import type { Wine } from '@/types/database';

export function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function WinePrice({ wine, compact = false }: { wine: Wine; compact?: boolean }) {
  const originalPrice = wine.original_price ?? wine.base_price ?? wine.price;
  const hasPromotion = Boolean(wine.discount_percent && originalPrice > wine.price);

  return (
    <span className={`flex ${compact ? 'items-baseline gap-1.5' : 'flex-col gap-0.5'}`}>
      {hasPromotion && (
        <span className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
          De <span className="line-through">{formatMoney(originalPrice)}</span>
        </span>
      )}
      <span className="font-bold text-[#741128]">{hasPromotion && <span className="mr-1 text-[10px] uppercase tracking-wide text-stone-500">Por</span>}{formatMoney(wine.price)}</span>
    </span>
  );
}
