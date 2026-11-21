import { isValidPhone, onlyDigits } from './customerRegistration';

export function normalizeCheckoutPhone(value: unknown): string {
  if (typeof value !== 'string') return '';
  const digits = onlyDigits(value);
  const local = digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2)
    : digits;
  return isValidPhone(local) ? local : '';
}

export function getCheckoutPhone(metadata: Record<string, unknown> | undefined): string {
  return normalizeCheckoutPhone(metadata?.whatsapp) || normalizeCheckoutPhone(metadata?.telefone);
}
