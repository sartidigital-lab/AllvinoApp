import type { Wine } from '@/types/database';

export function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function WinePrice({ wine, compact = false, reserveSpace = false }: { wine: Wine; compact?: boolean; reserveSpace?: boolean }) {
  const originalPrice = wine.original_price ?? wine.base_price ?? wine.price;
  const hasPromotion = Boolean(wine.discount_percent && originalPrice > wine.price);
  const layoutClass = compact
    ? 'items-baseline gap-1.5'
    : `flex-col gap-0.5 ${reserveSpace ? 'min-h-11 justify-end' : ''}`;

  return (
    <span className={`flex ${layoutClass}`}>
      {hasPromotion && (
        <span className="truncate text-[10px] font-bold uppercase tracking-wide text-stone-400">
          De <span className="line-through">{formatMoney(originalPrice)}</span>
        </span>
      )}
      <span className="whitespace-nowrap font-bold text-[#741128]">{hasPromotion && <span className="mr-1 text-[10px] uppercase tracking-wide text-stone-500">Por</span>}{formatMoney(wine.price)}</span>
    </span>
  );
}
