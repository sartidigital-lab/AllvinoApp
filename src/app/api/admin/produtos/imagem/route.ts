import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/security/rateLimit';
import { auditSecurityEvent } from '@/lib/security/audit';

const allowedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const maxImageBytes = 5 * 1024 * 1024;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'produto';
}

function getExtension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && ['png', 'jpg', 'jpeg', 'webp'].includes(fromName)) return fromName;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

async function hasValidImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return png || jpeg || webp;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function createTokenClient(accessToken: string) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const accessToken = getBearerToken(request);
  const supabase = accessToken ? createTokenClient(accessToken) : await createServerClient();
  const {
    data: { user },
    error: userError,
  } = accessToken ? await supabase.auth.getUser(accessToken) : await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Não autenticado. Entre novamente e tente subir a imagem outra vez.' }, { status: 401 });
  }

  if (user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas administradores podem enviar imagens.' }, { status: 403 });
  }

  const limit = checkRateLimit(getClientKey(request, 'admin-image', user.id), 20, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  const file = formData.get('file');
  const productName = String(formData.get('productName') || 'produto');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
  }

  if (file.size === 0 || file.size > maxImageBytes) {
    return NextResponse.json({ error: 'A imagem deve ter entre 1 byte e 5 MB.' }, { status: 400 });
  }

  if (!allowedImageTypes.has(file.type)) {
    return NextResponse.json({ error: 'Envie uma imagem PNG, JPG, JPEG ou WebP.' }, { status: 400 });
  }

  if (!(await hasValidImageSignature(file))) {
    return NextResponse.json({ error: 'O conteudo do arquivo nao corresponde a uma imagem valida.' }, { status: 400 });
  }

  const filePath = `${Date.now()}-${slugify(productName)}.${getExtension(file)}`;
  const { error: uploadError } = await supabase.storage
    .from('produtos')
    .upload(filePath, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Não foi possível enviar a imagem: ${uploadError.message}` },
      { status: 400 }
    );
  }

  const { data } = supabase.storage.from('produtos').getPublicUrl(filePath);
  auditSecurityEvent('admin.product-image.uploaded', { userId: user.id, path: filePath });
  return NextResponse.json({ publicUrl: data.publicUrl, path: filePath });
}
