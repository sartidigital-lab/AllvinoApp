type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function getClientKey(request: Request, scope: string, identity?: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip') || 'unknown';
  return `${scope}:${identity || ip}`;
}

export function checkRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  current.count += 1;
  return {
    allowed: current.count <= max,
    retryAfter: Math.ceil((current.resetAt - now) / 1000),
  };
}

export function rateLimitResponse(retryAfter: number) {
  return new Response(JSON.stringify({ error: 'Muitas tentativas. Aguarde e tente novamente.' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(retryAfter),
    },
  });
}
