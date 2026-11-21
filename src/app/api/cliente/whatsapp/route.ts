import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeCheckoutPhone } from '@/lib/auth/checkoutPhone';
import { isSameOrigin } from '@/lib/push/subscription';
import { checkRateLimitDistributed, getClientKey, rateLimitResponse } from '@/lib/security/rateLimit';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const limit = await checkRateLimitDistributed(getClientKey(request, 'checkout-phone', user.id), 10, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  const body = await request.json().catch(() => null);
  const parsed = z.object({ whatsapp: z.string().max(40) }).safeParse(body);
  const phone = parsed.success ? normalizeCheckoutPhone(parsed.data.whatsapp) : '';
  if (!phone) return NextResponse.json({ error: 'Informe um WhatsApp válido com DDD.' }, { status: 400 });

  const { error } = await supabase.auth.updateUser({ data: { whatsapp: phone } });
  if (error) return NextResponse.json({ error: 'Não foi possível salvar seu WhatsApp. Tente novamente.' }, { status: 500 });
  return NextResponse.json({ phone }, { headers: { 'Cache-Control': 'no-store' } });
}
