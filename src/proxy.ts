import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const secureCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}
const migratedCookieOptions = {
  ...secureCookieOptions,
  maxAge: 400 * 24 * 60 * 60,
}

function createContentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://connect.facebook.net https://www.googletagmanager.com${isDevelopment ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://www.facebook.com https://www.google-analytics.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://brasilapi.com.br https://viacep.com.br https://connect.facebook.net https://www.facebook.com https://www.googletagmanager.com https://www.google-analytics.com",
    "frame-src 'self' https://*.supabase.co",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ]

  if (!isDevelopment) directives.push('upgrade-insecure-requests')
  return directives.join('; ')
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const contentSecurityPolicy = createContentSecurityPolicy(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const applySecurityHeaders = (response: NextResponse) => {
    if (response !== supabaseResponse) {
      supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
      for (const header of ['cache-control', 'expires', 'pragma']) {
        const value = supabaseResponse.headers.get(header)
        if (value) response.headers.set(header, value)
      }
    }
    response.headers.set('Content-Security-Policy', contentSecurityPolicy)
    return response
  }
  applySecurityHeaders(supabaseResponse)

  // Upgrade sessions created before the HttpOnly migration on their next
  // request. Supabase uses `sb-*` chunk cookies, so every chunk must receive
  // the hardened attributes together.
  request.cookies.getAll()
    .filter((cookie) => cookie.name.startsWith('sb-'))
    .forEach((cookie) => supabaseResponse.cookies.set(cookie.name, cookie.value, migratedCookieOptions))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: secureCookieOptions,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options, ...secureCookieOptions }))
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, ...secureCookieOptions })
          )
          applySecurityHeaders(supabaseResponse)
        },
      },
    }
  )

  // `getClaims()` returns `data: null` when an anonymous request has no
  // session cookie. Treat that as the expected unauthenticated state instead
  // of allowing a destructuring error to turn every public request into a 500.
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  const protectedRoutes = ['/conta', '/admin']
  const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute && !claims?.sub) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('login', 'true')
    url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search)
    return applySecurityHeaders(NextResponse.redirect(url))
  }

  if (request.nextUrl.pathname.startsWith('/admin')) {
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')

    if (adminError || isAdmin !== true) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('admin', 'unauthorized')
      return applySecurityHeaders(NextResponse.redirect(url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
