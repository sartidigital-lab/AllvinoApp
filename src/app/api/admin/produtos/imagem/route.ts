import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { checkRateLimitDistributed, getClientKey, rateLimitResponse } from '@/lib/security/rateLimit';
import { auditSecurityEvent } from '@/lib/security/audit';
import { isSameOrigin } from '@/lib/push/subscription';
import { createClient } from '@/utils/supabase/server';

const allowedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const maxImageBytes = 5 * 1024 * 1024;
const maxImagePixels = 40_000_000;
const maxImageDimension = 4096;

async function hasValidImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return (
    (file.type === 'image/png' && png) ||
    (file.type === 'image/jpeg' && jpeg) ||
    (file.type === 'image/webp' && webp)
  );
}

async function normalizeImage(file: File) {
  const input = Buffer.from(await file.arrayBuffer());
  const image = sharp(input, { limitInputPixels: maxImagePixels, failOn: 'error' }).rotate();
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Image dimensions are unavailable.');
  }

  const buffer = await image
    .resize({
      width: maxImageDimension,
      height: maxImageDimension,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  if (buffer.length === 0 || buffer.length > maxImageBytes) {
    throw new Error('Normalized image exceeds the size limit.');
  }

  return buffer;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Não autenticado. Entre novamente e tente subir a imagem outra vez.' }, { status: 401 });
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');

  if (adminError || isAdmin !== true) {
    return NextResponse.json({ error: 'Apenas administradores podem enviar imagens.' }, { status: 403 });
  }

  const limit = await checkRateLimitDistributed(getClientKey(request, 'admin-image', user.id), 20, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Requisicao de upload invalida.' }, { status: 400 });
  }

  const file = formData.get('file');
  const assetType = formData.get('assetType') === 'banner' ? 'banner' : 'product';

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

  let normalizedImage: Buffer;
  try {
    normalizedImage = await normalizeImage(file);
  } catch {
    auditSecurityEvent(`admin.${assetType}-image.rejected`, { userId: user.id, reason: 'invalid_or_unsafe_image' });
    return NextResponse.json({ error: 'A imagem nao pode ser processada com seguranca.' }, { status: 400 });
  }

  const filePath = `${assetType === 'banner' ? 'banners/' : ''}${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from('produtos')
    .upload(filePath, normalizedImage, {
      cacheControl: '31536000',
      upsert: false,
      contentType: 'image/webp',
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Não foi possível enviar a imagem: ${uploadError.message}` },
      { status: 400 }
    );
  }

  const { data } = supabase.storage.from('produtos').getPublicUrl(filePath);
  auditSecurityEvent(`admin.${assetType}-image.uploaded`, { userId: user.id, path: filePath });
  return NextResponse.json({ publicUrl: data.publicUrl, path: filePath });
}
