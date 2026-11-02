import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { safeInternalRedirect } from '@/lib/auth/safeRedirect';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { checkoutRequestSchema } from '@/lib/validation/checkout';
import { getPasswordPolicyError } from '@/lib/auth/passwordPolicy';

describe('security controls', () => {
  it('allows only known internal redirects', () => {
    expect(safeInternalRedirect('/checkout')).toBe('/checkout');
    expect(safeInternalRedirect('/conta?tab=orders')).toBe('/conta?tab=orders');
    expect(safeInternalRedirect('/recuperar-senha')).toBe('/recuperar-senha');
    expect(safeInternalRedirect('https://evil.example')).toBe('/');
    expect(safeInternalRedirect('//evil.example')).toBe('/');
    expect(safeInternalRedirect('/admin/users')).toBe('/');
  });

  it('rejects oversized or malformed checkout payloads', () => {
    const valid = {
      cartItems: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Vinho', quantity: 1 }],
      deliveryMethod: 'Retirada na Loja',
      paymentMethod: 'Pix',
    };

    expect(checkoutRequestSchema.safeParse(valid).success).toBe(true);
    expect(checkoutRequestSchema.safeParse({ ...valid, cartItems: [{ ...valid.cartItems[0], quantity: 51 }] }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ ...valid, deliveryAddress: 'x'.repeat(501) }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ ...valid, deliveryZipCode: '123' }).success).toBe(false);
  });

  it('limits repeated requests within a window', () => {
    const key = `test:${crypto.randomUUID()}`;
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(false);
  });

  it('matches the Supabase password character policy before submission', () => {
    expect(getPasswordPolicyError('abcdefgh')).toContain('maiúscula');
    expect(getPasswordPolicyError('Abcdefgh')).toContain('número');
    expect(getPasswordPolicyError('Abcdefg1')).toContain('símbolo');
    expect(getPasswordPolicyError('Abcdefg1!')).toBeNull();
  });

  it('allows CEP providers in the browser connection policy', () => {
    const nextConfig = readFileSync('next.config.mjs', 'utf8');
    const proxy = readFileSync('src/proxy.ts', 'utf8');

    expect(nextConfig).toContain('Strict-Transport-Security');
    expect(proxy).toContain("connect-src 'self'");
    expect(proxy).toContain('https://brasilapi.com.br');
    expect(proxy).toContain('https://viacep.com.br');
    expect(proxy).toContain("'strict-dynamic'");
    expect(proxy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(readFileSync('src/app/layout.tsx', 'utf8')).toContain('await connection()');
  });

  it('keeps the Supabase BFF limited to authenticated admin data routes', () => {
    const bff = readFileSync('src/app/api/bff/supabase/route.ts', 'utf8');
    const upload = readFileSync('src/app/api/admin/produtos/imagem/route.ts', 'utf8');

    expect(bff).toContain('adminTables');
    expect(bff).toContain("rpc('is_admin')");
    expect(bff).toContain('isSameOrigin');
    expect(upload).toContain('isSameOrigin');
    expect(upload).not.toContain('Bearer ');
  });

  it('keeps authentication tokens out of browser JavaScript', () => {
    const browserClient = readFileSync('src/utils/supabase/client.ts', 'utf8');
    const serverClient = readFileSync('src/utils/supabase/server.ts', 'utf8');
    const authModal = readFileSync('src/components/auth/AuthModal.tsx', 'utf8');
    const callback = readFileSync('src/app/auth/callback/route.ts', 'utf8');

    expect(browserClient).not.toContain('createBrowserClient');
    expect(browserClient).toContain('persistSession: false');
    expect(serverClient).toContain('httpOnly: true');
    expect(readFileSync('src/proxy.ts', 'utf8')).toContain("cookie.name.startsWith('sb-')");
    expect(authModal).toContain("'/api/auth/login'");
    expect(authModal).not.toContain('supabase.auth.');
    expect(callback).toContain('createBffAuthClient');
  });
});
