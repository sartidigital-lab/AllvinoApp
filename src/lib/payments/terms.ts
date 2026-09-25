export const PIX_DISCOUNT_RATE = 0.05;
export const MAX_CARD_INSTALLMENTS = 3;
export const MIN_CARD_INSTALLMENT_AMOUNT = 0;

export function calculatePixDiscount(subtotal: number) {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  return Number((subtotal * PIX_DISCOUNT_RATE).toFixed(2));
}

export function getMaximumCardInstallments(total: number) {
  if (!Number.isFinite(total) || total <= 0) return 1;

  return MAX_CARD_INSTALLMENTS;
}

export function getCardInstallmentOptions(total: number) {
  return Array.from({ length: getMaximumCardInstallments(total) }, (_, index) => index + 1);
}

export function normalizeCardInstallments(total: number, requestedInstallments?: number) {
  const requested = Number.isFinite(requestedInstallments)
    ? Math.max(1, Math.trunc(requestedInstallments || 1))
    : 1;

  return Math.min(requested, getMaximumCardInstallments(total));
}
