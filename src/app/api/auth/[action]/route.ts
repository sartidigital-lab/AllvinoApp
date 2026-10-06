import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPasswordPolicyError } from '@/lib/auth/passwordPolicy';
import { isValidCpf, isValidPhone, onlyDigits } from '@/lib/auth/customerRegistration';
import { safeInternalRedirect } from '@/lib/auth/safeRedirect';
import { toCurrentUser } from '@/lib/auth/userProfile';
import { isSameOrigin } from '@/lib/push/subscription';
import { createBffAuthClient } from '@/utils/supabase/bff-server';

const credentialsSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

const signupSchema = credentialsSchema.extend({
  name: z.string().trim().min(2).max(120),
  cpf: z.string().trim().max(32),
  phone: z.string().trim().max(40),
  whatsapp: z.string().trim().max(40),
  whatsappSamePhone: z.boolean(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  redirectTo: z.string().optional(),
});

const redirectSchema = z.object({ redirectTo: z.string().optional() });
const passwordSchema = z.object({ password: z.string().min(8).max(128) });
const profileSchema = z.object({ name: z.string().trim().min(2).max(120) });
type RouteContext = { params: Promise<{ action: string }> };

function responseError(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function callbackUrl(request: Request, next: string) {
  const url = new URL('/auth/callback', request.url);
  url.searchParams.set('next', next);
  return url.toString();
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { action } = await params;
  if (action !== 'session') return responseError('Rota não encontrada.', 404);

  const supabase = await createBffAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return responseError('Não autenticado.', 401);

  const { data: isAdmin } = await supabase.rpc('is_admin');
  return NextResponse.json({ user: toCurrentUser(user), isAdmin: isAdmin === true }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  if (!isSameOrigin(request)) return responseError('Origem inválida.', 403);

  const { action } = await params;
  const body = await request.json().catch(() => null);
  const supabase = await createBffAuthClient();

  if (action === 'login') {
    const parsed = credentialsSchema.safeParse(body);
    if (!parsed.success) return responseError('E-mail ou senha inválidos.');

    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !data.user) return responseError('E-mail ou senha inválidos.', 401);
    return NextResponse.json({ user: toCurrentUser(data.user) }, { headers: { 'Cache-Control': 'no-store' } });
  }

  if (action === 'signup') {
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return responseError('Dados de cadastro inválidos.');
    }
    const signup = parsed.data;
    if (!isValidCpf(signup.cpf) || !isValidPhone(signup.phone) || !isValidPhone(signup.whatsapp)) {
      return responseError('Dados de cadastro inválidos.');
    }
    const passwordError = getPasswordPolicyError(signup.password);
    if (passwordError) return responseError(passwordError);
    if (signup.birthDate && signup.birthDate > new Date().toISOString().slice(0, 10)) {
      return responseError('A data de aniversário não pode estar no futuro.');
    }

    const next = safeInternalRedirect(signup.redirectTo);
    const { data, error } = await supabase.auth.signUp({
      email: signup.email,
      password: signup.password,
      options: {
        data: {
          nome_completo: signup.name,
          cpf: onlyDigits(signup.cpf),
          telefone: onlyDigits(signup.phone),
          whatsapp: onlyDigits(signup.whatsapp),
          whatsapp_mesmo_telefone: signup.whatsappSamePhone,
          data_nascimento: signup.birthDate || null,
        },
        emailRedirectTo: callbackUrl(request, next),
      },
    });
    if (error) return responseError('Não foi possível criar o cadastro.');
    return NextResponse.json({
      requiresEmailConfirmation: !data.session,
      user: data.user ? toCurrentUser(data.user) : null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  if (action === 'logout') {
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  }

  if (action === 'recover') {
    const parsed = z.object({ email: z.string().trim().email().max(255) }).safeParse(body);
    if (!parsed.success) return responseError('Informe um e-mail válido.');
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: callbackUrl(request, '/recuperar-senha'),
    });
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  }

  if (action === 'password') {
    const parsed = passwordSchema.safeParse(body);
    const policyError = parsed.success ? getPasswordPolicyError(parsed.data.password) : 'Senha inválida.';
    if (policyError) return responseError(policyError);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return responseError('Link inválido ou expirado.', 401);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return responseError('Não foi possível atualizar a senha.');
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  }

  if (action === 'profile') {
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) return responseError('Nome inválido.');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return responseError('Não autenticado.', 401);
    const { data, error } = await supabase.auth.updateUser({
      data: { ...user.user_metadata, nome_completo: parsed.data.name },
    });
    if (error || !data.user) return responseError('Não foi possível atualizar o perfil.');
    return NextResponse.json({ user: toCurrentUser(data.user) }, { headers: { 'Cache-Control': 'no-store' } });
  }

  if (action === 'oauth') {
    const parsed = redirectSchema.safeParse(body);
    if (!parsed.success) return responseError('Solicitação inválida.');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl(request, safeInternalRedirect(parsed.data.redirectTo)) },
    });
    if (error || !data.url) return responseError('Não foi possível iniciar a autenticação Google.');
    return NextResponse.json({ url: data.url }, { headers: { 'Cache-Control': 'no-store' } });
  }

  return responseError('Rota não encontrada.', 404);
}
