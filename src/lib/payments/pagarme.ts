import 'server-only';

export type PagarmePaymentMethod = 'pix' | 'credit_card';

export type PagarmePaymentLinkInput = {
  orderId: string;
  amountCents: number;
  paymentMethod: PagarmePaymentMethod;
  installments: number;
};

type PagarmePaymentLinkResponse = {
  id?: string;
  url?: string;
  expires_at?: string | null;
  message?: string;
  errors?: unknown;
};

type PagarmeErrorDetail = {
  code: string | null;
  type: string | null;
  parameter: string | null;
  message: string | null;
};

export class PagarmePaymentLinkError extends Error {
  readonly httpStatus: number;
  readonly errorCode: string;
  readonly requestId: string | null;
  readonly providerErrors: PagarmeErrorDetail[];
  readonly providerResponseType: string;
  readonly providerResponseKeys: string[];

  constructor(options: {
    httpStatus: number;
    errorCode: string;
    requestId: string | null;
    providerErrors: PagarmeErrorDetail[];
    providerResponseType: string;
    providerResponseKeys: string[];
  }) {
    super('Não foi possível criar o checkout de pagamento.');
    this.name = 'PagarmePaymentLinkError';
    this.httpStatus = options.httpStatus;
    this.errorCode = options.errorCode;
    this.requestId = options.requestId;
    this.providerErrors = options.providerErrors;
    this.providerResponseType = options.providerResponseType;
    this.providerResponseKeys = options.providerResponseKeys;
  }
}

const DEFAULT_LINK_EXPIRATION_MINUTES = 30;

function getPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function cents(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('O valor do pagamento é inválido.');
  }

  return value;
}

export function buildPagarmePaymentLinkPayload(input: PagarmePaymentLinkInput) {
  const amount = cents(input.amountCents);
  const expiresIn = getPositiveInteger(
    process.env.PAGARME_PAYMENT_LINK_EXPIRES_IN_MINUTES,
    DEFAULT_LINK_EXPIRATION_MINUTES
  );

  const paymentSettings = input.paymentMethod === 'credit_card'
    ? {
        accepted_payment_methods: ['credit_card'],
        credit_card_settings: {
          operation_type: 'auth_and_capture',
          installments_setup: { interest_type: 'simple' },
          installments: Array.from({ length: input.installments }, (_, index) => ({
            number: index + 1,
            total: amount,
          })),
        },
      }
    : {
        accepted_payment_methods: ['pix'],
        // Pagar.me recebe a expiração do QR dinâmico em segundos.
        pix_settings: { expires_in: expiresIn * 60 },
      };

  return {
    type: 'order',
    name: `Allvino - pedido ${input.orderId.slice(0, 8).toUpperCase()}`,
    order_code: input.orderId,
    expires_in: expiresIn,
    max_paid_sessions: 1,
    payment_settings: paymentSettings,
    cart_settings: {
      items: [
        {
          name: `Pedido Allvino #${input.orderId.slice(0, 8).toUpperCase()}`,
          amount,
          default_quantity: 1,
        },
      ],
    },
  };
}

function getPagarmeConfig() {
  const secretKey = process.env.PAGARME_SECRET_KEY?.trim();
  const baseUrl = process.env.PAGARME_BASE_URL?.trim() || 'https://api.pagar.me/core/v5';

  if (!secretKey) {
    throw new Error('PAGARME_SECRET_KEY não está configurada.');
  }

  return { secretKey, baseUrl: baseUrl.replace(/\/$/, '') };
}

function safeProviderText(value: unknown, maxLength = 240): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  return value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/(?:\+?\d[\s().-]*){8,}/g, '[number]')
    .replace(/\b\d{11,14}\b/g, '[number]')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function readProviderErrors(value: unknown): PagarmeErrorDetail[] {
  const details: PagarmeErrorDetail[] = [];
  const visited = new Set<object>();
  const nestedErrorKeys = new Set(['error', 'errors', 'details', 'issues', 'violations', 'response', 'data', 'cause']);

  function visit(entry: unknown, depth = 0, parentKey = 'response') {
    if (depth > 5 || details.length >= 5) return;

    if (typeof entry === 'string') {
      const message = safeProviderText(entry);
      if (message && ['error', 'errors', 'message', 'description', 'detail', 'reason', 'response'].includes(parentKey)) {
        details.push({ code: null, type: null, parameter: null, message });
      }
      return;
    }

    if (Array.isArray(entry)) {
      for (const item of entry.slice(0, 10)) visit(item, depth + 1, parentKey);
      return;
    }

    if (!entry || typeof entry !== 'object' || visited.has(entry)) return;
    visited.add(entry);
    const detail = entry as Record<string, unknown>;
    const code = safeProviderText(detail.code ?? detail.error_code ?? detail.errorCode, 100);
    const type = safeProviderText(detail.type ?? detail.category, 100);
    const parameter = safeProviderText(detail.parameter ?? detail.param ?? detail.field, 100);
    const message = safeProviderText(detail.message ?? detail.description ?? detail.detail ?? detail.reason
      ?? (typeof detail.error === 'string' ? detail.error : undefined));

    if (code || type || parameter || message) details.push({ code, type, parameter, message });

    for (const [key, nested] of Object.entries(detail)) {
      if (nestedErrorKeys.has(key.toLowerCase())) visit(nested, depth + 1, key.toLowerCase());
    }
  }

  visit(value);
  return details.slice(0, 5);
}

export async function createPagarmePaymentLink(input: PagarmePaymentLinkInput) {
  const { secretKey, baseUrl } = getPagarmeConfig();
  const authorization = Buffer.from(`${secretKey}:`).toString('base64');
  const response = await fetch(`${baseUrl}/paymentlinks`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authorization}`,
      'Content-Type': 'application/json',
      'User-Agent': 'allvino-app/1.0',
    },
    body: JSON.stringify(buildPagarmePaymentLinkPayload(input)),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });

  const responseBody = await response.text().catch(() => '');
  let decodedPayload: unknown = {};
  try {
    decodedPayload = responseBody ? JSON.parse(responseBody) : {};
  } catch {
    decodedPayload = responseBody;
  }
  const payload = decodedPayload && typeof decodedPayload === 'object' && !Array.isArray(decodedPayload)
    ? decodedPayload as PagarmePaymentLinkResponse
    : {};
  if (!response.ok || !payload.id || !payload.url) {
    const providerErrors = readProviderErrors(decodedPayload);
    const responseCode = providerErrors.find((error) => error.code)?.code;
    const errorCode = responseCode || `PAGARME_HTTP_${response.status}`;
    const requestId = response.headers.get('x-request-id')
      || response.headers.get('request-id')
      || response.headers.get('x-pagarme-request-id')
      || (typeof decodedPayload === 'object' && decodedPayload !== null && !Array.isArray(decodedPayload)
        ? safeProviderText((decodedPayload as Record<string, unknown>).request_id
          ?? (decodedPayload as Record<string, unknown>).requestId, 160)
        : null);
    const providerResponseType = Array.isArray(decodedPayload)
      ? 'array'
      : decodedPayload === null ? 'null' : typeof decodedPayload;
    const providerResponseKeys = decodedPayload && typeof decodedPayload === 'object' && !Array.isArray(decodedPayload)
      ? Object.keys(decodedPayload).slice(0, 20)
      : [];

    throw new PagarmePaymentLinkError({
      httpStatus: response.status,
      errorCode,
      requestId: safeProviderText(requestId, 160),
      providerErrors,
      providerResponseType,
      providerResponseKeys,
    });
  }

  return {
    id: payload.id,
    url: payload.url,
    expiresAt: payload.expires_at || null,
  };
}
