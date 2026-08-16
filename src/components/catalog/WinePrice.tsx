import type { Wine } from '@/types/database';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function WinePrice({ wine, compact = false }: { wine: Wine; compact?: boolean }) {
  const hasPromotion = Boolean(wine.discount_percent && wine.original_price > wine.price);

  return (
    <span className={`flex ${compact ? 'items-baseline gap-1.5' : 'flex-col'}`}>
      {hasPromotion && (
        <span className="text-[10px] font-semibold text-stone-400 line-through">
          {formatMoney(wine.original_price)}
        </span>
      )}
      <span className="font-bold text-[#B91C1C]">{formatMoney(wine.price)}</span>
    </span>
  );
}
