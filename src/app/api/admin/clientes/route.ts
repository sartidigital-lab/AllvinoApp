import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { isValidCpf, isValidPhone, onlyDigits } from '@/lib/auth/customerRegistration';
import { getPasswordPolicyError } from '@/lib/auth/passwordPolicy';
import { isSameOrigin } from '@/lib/push/subscription';
import { auditSecurityEvent } from '@/lib/security/audit';
import { checkRateLimitDistributed, getClientKey, rateLimitResponse } from '@/lib/security/rateLimit';
import { createClient } from '@/utils/supabase/server';

const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  cpf: z.string().trim().max(32),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40),
  password: z.string().min(8).max(128),
  whatsappOffers: z.boolean(),
});

function responseError(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return responseError('Origem inválida.', 403);

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return responseError('Não autenticado.', 401);

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
  if (adminError || isAdmin !== true) return responseError('Acesso administrativo necessário.', 403);

  const limit = await checkRateLimitDistributed(getClientKey(request, 'admin-customer-create', user.id), 10, 10 * 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  const parsed = customerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return responseError('Preencha os dados do cliente corretamente.');

  const customer = parsed.data;
  if (!isValidCpf(customer.cpf)) return responseError('Informe um CPF válido.');
  if (!isValidPhone(customer.phone)) return responseError('Informe um telefone ou WhatsApp válido com DDD.');

  const passwordError = getPasswordPolicyError(customer.password);
  if (passwordError) return responseError(passwordError);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error('Missing Supabase service role configuration for admin customer creation.');
    return responseError('O cadastro de clientes não está configurado. Contate o suporte técnico.', 503);
  }

  const admin = createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.createUser({
    email: customer.email.toLocaleLowerCase('pt-BR'),
    password: customer.password,
    email_confirm: true,
    user_metadata: {
      nome_completo: customer.name,
      cpf: onlyDigits(customer.cpf),
      telefone: onlyDigits(customer.phone),
      whatsapp: onlyDigits(customer.phone),
      whatsapp_mesmo_telefone: true,
      recebe_ofertas_whatsapp: customer.whatsappOffers,
      cadastro_origem: 'loja_fisica',
    },
  });

  if (error || !data.user) {
    const isExistingEmail = /already (been )?registered|already exists|duplicate/i.test(error?.message || '');
    return responseError(
      isExistingEmail ? 'Já existe um cliente cadastrado com este e-mail.' : 'Não foi possível cadastrar o cliente. Tente novamente.',
      isExistingEmail ? 409 : 400,
    );
  }

  auditSecurityEvent('admin.customer.created', {
    actorId: user.id,
    customerId: data.user.id,
    whatsappOffers: customer.whatsappOffers,
  });

  return NextResponse.json({
    customer: {
      id: data.user.id,
      name: customer.name,
      email: data.user.email,
    },
  }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}


