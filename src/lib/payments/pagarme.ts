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
  message?: unknown;
  error?: unknown;
  code?: unknown;
  type?: unknown;
  parameter?: unknown;
  description?: unknown;
  detail?: unknown;
  title?: unknown;
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

  constructor(options: {
    httpStatus: number;
    errorCode: string;
    requestId: string | null;
    providerErrors: PagarmeErrorDetail[];
  }) {
    super('Não foi possível criar o checkout de pagamento.');
    this.name = 'PagarmePaymentLinkError';
    this.httpStatus = options.httpStatus;
    this.errorCode = options.errorCode;
    this.requestId = options.requestId;
    this.providerErrors = options.providerErrors;
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

function readProviderErrors(value: unknown, fallbackParameter: string | null = null): PagarmeErrorDetail[] {
  if (Array.isArray(value)) {
    return value.slice(0, 5).flatMap((entry) => readProviderErrors(entry, fallbackParameter)).slice(0, 5);
  }

  if (typeof value === 'string') {
    const message = safeProviderText(value);
    return message ? [{ code: null, type: null, parameter: safeProviderText(fallbackParameter, 100), message }] : [];
  }

  if (!value || typeof value !== 'object') return [];

  const detail = value as Record<string, unknown>;
  const hasStructuredError = [
    'code', 'error_code', 'type', 'category', 'parameter', 'param', 'field',
    'message', 'description', 'detail', 'title',
  ].some((key) => detail[key] !== undefined && detail[key] !== null);

  if (hasStructuredError) {
    const code = safeProviderText(detail.code ?? detail.error_code, 100);
    const type = safeProviderText(detail.type ?? detail.category, 100);
    const parameter = safeProviderText(detail.parameter ?? detail.param ?? detail.field ?? fallbackParameter, 100);
    const message = safeProviderText(detail.message ?? detail.description ?? detail.detail ?? detail.title);
    return code || type || parameter || message ? [{ code, type, parameter, message }] : [];
  }

  return Object.entries(detail).slice(0, 5).flatMap(([parameter, messages]) =>
    readProviderErrors(messages, parameter)
  ).slice(0, 5);
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

  const payload = await response.json().catch(() => ({})) as PagarmePaymentLinkResponse;
  if (!response.ok || !payload.id || !payload.url) {
    const providerErrors = readProviderErrors(payload.errors);
    if (providerErrors.length === 0) {
      providerErrors.push(...readProviderErrors(payload.error));
    }
    if (providerErrors.length === 0) {
      providerErrors.push(...readProviderErrors({
        code: payload.code,
        type: payload.type,
        parameter: payload.parameter,
        message: payload.message,
        description: payload.description,
        detail: payload.detail,
        title: payload.title,
      }));
    }
    const responseCode = providerErrors.find((error) => error.code)?.code;
    const errorCode = responseCode || `PAGARME_HTTP_${response.status}`;
    const requestId = response.headers.get('x-request-id')
      || response.headers.get('request-id')
      || response.headers.get('x-pagarme-request-id');

    throw new PagarmePaymentLinkError({
      httpStatus: response.status,
      errorCode,
      requestId: safeProviderText(requestId, 160),
      providerErrors,
    });
  }

  return {
    id: payload.id,
    url: payload.url,
    expiresAt: payload.expires_at || null,
  };
}
