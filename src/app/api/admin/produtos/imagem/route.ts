import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';

const allowedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

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
  const formAccessToken = formData.get('accessToken');
  const accessToken = getBearerToken(request) || (typeof formAccessToken === 'string' ? formAccessToken : null);
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

  const file = formData.get('file');
  const productName = String(formData.get('productName') || 'produto');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 });
  }

  if (!allowedImageTypes.has(file.type)) {
    return NextResponse.json({ error: 'Envie uma imagem PNG, JPG, JPEG ou WebP.' }, { status: 400 });
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
  return NextResponse.json({ publicUrl: data.publicUrl, path: filePath });
}
