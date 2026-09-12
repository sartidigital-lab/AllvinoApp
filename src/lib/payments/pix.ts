import QRCode from 'qrcode';
import { env } from '@/env.mjs';

function normalizeText(value: string, maxLength: number) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, maxLength);
}

function formatField(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;

  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function getPixConfig() {
  return {
    key: env.NEXT_PUBLIC_PIX_KEY?.trim() || '',
    merchantName: normalizeText(env.NEXT_PUBLIC_PIX_MERCHANT_NAME || 'ALLVINO', 25),
    merchantCity: normalizeText(env.NEXT_PUBLIC_PIX_MERCHANT_CITY || 'VITORIA', 15),
  };
}

export type PixConfig = ReturnType<typeof getPixConfig>;

export function createPixPayload(amount: number, config: PixConfig = getPixConfig()) {
  if (!config.key || !Number.isFinite(amount) || amount <= 0) return null;

  const amountValue = amount.toFixed(2);
  const merchantAccount = formatField(
    '26',
    formatField('00', 'BR.GOV.BCB.PIX') + formatField('01', config.key)
  );
  const additionalData = formatField('62', formatField('05', '***'));
  const payload = [
    formatField('00', '01'),
    merchantAccount,
    formatField('52', '0000'),
    formatField('53', '986'),
    formatField('54', amountValue),
    formatField('58', 'BR'),
    formatField('59', config.merchantName),
    formatField('60', config.merchantCity),
    additionalData,
    '6304',
  ].join('');

  return `${payload}${crc16(payload)}`;
}

export async function createPixQrCode(payload: string) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
  });
}
