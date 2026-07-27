import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { toCurrentUser } from '@/lib/auth/userProfile';
import { auditSecurityEvent } from '@/lib/security/audit';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/security/rateLimit';

const profileUpdateSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  whatsapp: z.string().trim().min(8).max(40),
  nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
  }

  return NextResponse.json({ user: toCurrentUser(user) }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
  }

  const limit = checkRateLimit(getClientKey(request, 'profile-update', user.id), 10, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo da requisicao invalido.' }, { status: 400 });
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados de perfil invalidos.' }, { status: 400 });
  }

  const { data, error } = await supabase.auth.updateUser({
    data: {
      nome_completo: parsed.data.nome,
      telefone: parsed.data.whatsapp,
      data_nascimento: parsed.data.nascimento,
    },
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || 'Nao foi possivel atualizar o perfil.' }, { status: 400 });
  }

  auditSecurityEvent('customer.profile.updated', { userId: user.id });

  return NextResponse.json({ user: toCurrentUser(data.user) });
}
