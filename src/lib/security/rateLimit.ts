type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

type RateLimitResult = { allowed: boolean; retryAfter: number };

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

/**
 * Uses Upstash Redis when configured, keeping the in-memory limiter as a safe
 * local-development fallback. The REST pipeline makes the increment and TTL
 * update visible across Vercel instances.
 */
export async function checkRateLimitDistributed(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return checkRateLimit(key, max, windowMs);
  }

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', `allvino:rate:${key}`],
        ['EXPIRE', `allvino:rate:${key}`, Math.ceil(windowMs / 1000)],
        ['TTL', `allvino:rate:${key}`],
      ]),
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`Upstash returned ${response.status}`);

    const results = await response.json() as Array<{ result?: number }>;
    const count = Number(results[0]?.result);
    const ttl = Math.max(1, Number(results[2]?.result || Math.ceil(windowMs / 1000)));

    if (!Number.isFinite(count)) throw new Error('Invalid Upstash response');

    return {
      allowed: count <= max,
      retryAfter: count <= max ? 0 : ttl,
    };
  } catch (error) {
    console.warn('Distributed rate limit unavailable; using local fallback.', error);
    return checkRateLimit(key, max, windowMs);
  }
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
