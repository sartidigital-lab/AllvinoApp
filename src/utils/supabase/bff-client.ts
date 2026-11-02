import { createClient } from '@supabase/supabase-js';

/**
 * Browser data client for authenticated BFF calls.
 *
 * It keeps the Supabase query builder ergonomics, but every REST/Storage
 * request is sent to our same-origin BFF. No access or refresh token is kept
 * in browser storage and Auth endpoints are intentionally unavailable here.
 */
function bffFetch(input: RequestInfo | URL, init?: RequestInit) {
  const requestUrl = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;
  const upstream = new URL(requestUrl);
  const expectedOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;

  if (upstream.origin !== expectedOrigin) {
    return fetch(input, init);
  }

  const target = new URL('/api/bff/supabase', window.location.origin);
  target.searchParams.set('path', `${upstream.pathname}${upstream.search}`);

  return fetch(target, {
    ...init,
    method: init?.method || (input instanceof Request ? input.method : undefined),
    headers: init?.headers || (input instanceof Request ? input.headers : undefined),
    body: init?.body || (input instanceof Request ? input.body : undefined),
  });
}

export function createBffClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: { fetch: bffFetch },
    }
  );
}
