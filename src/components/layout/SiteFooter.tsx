"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, QrCode, Share2 } from 'lucide-react';

const shareTitle = 'Allvino';
const shareText = 'Conheça a Allvino, sua adega digital de vinhos premium.';

async function copySiteLink(url: string) {
  const text = `${shareText}\n${url}`;

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function SiteFooter() {
  const [siteUrl, setSiteUrl] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [supportsNativeShare, setSupportsNativeShare] = useState(false);

  useEffect(() => {
    const url = `${window.location.origin}/`;
    setSiteUrl(url);
    setSupportsNativeShare(Boolean(navigator.share));

    QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 176,
    }).then(setQrCodeUrl).catch(() => setShareMessage('Não foi possível gerar o QR Code agora.'));
  }, []);

  const handleShare = async () => {
    if (!siteUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: siteUrl });
        setShareMessage('Obrigado por compartilhar a Allvino.');
        return;
      }

      await copySiteLink(siteUrl);
      setShareMessage('Link copiado para compartilhar.');
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        setShareMessage('Não foi possível compartilhar agora.');
      }
    }
  };

  return (
    <footer className="mx-auto mt-16 max-w-7xl border-t border-brand-border px-4 pb-32 pt-10 lg:px-8" aria-label="Rodapé da Allvino">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="max-w-3xl space-y-7 text-sm leading-7 text-brand-ink-light">
          <section>
            <h2 className="mb-3 font-serif text-xl font-bold text-brand-ink">Sobre a Allvino</h2>
            <p>Somos importadores de vinhos e trabalhamos com marcas exclusivas e não exclusivas. Atendemos os segmentos de atacado (B2B) e varejo (B2C) com representantes, lojas online e física, além do nosso espaço gastronômico para levar o máximo de experiência aos nossos clientes.</p>
          </section>
          <section>
            <h2 className="mb-3 font-serif text-xl font-bold text-brand-ink">Compre online</h2>
            <p>Compre online com pagamento no checkout e receba em seu endereço ou retire em nossa loja.</p>
          </section>
          <section>
            <h2 className="mb-3 font-serif text-xl font-bold text-brand-ink">Nossa localização</h2>
            <address className="not-italic">Rua Goiânia, 339 - Itapuã, Vila Velha - ES, 29101-780</address>
          </section>
          <Link href="/privacidade" className="inline-flex font-bold text-brand-primary underline underline-offset-4 hover:text-brand-primary-hover">Política de privacidade</Link>
        </div>

        <section aria-labelledby="site-qr-code-title" className="rounded-brand-2xl border border-brand-border bg-white p-5 text-center shadow-brand-sm">
          <QrCode className="mx-auto h-6 w-6 text-brand-primary" aria-hidden="true" />
          <h2 id="site-qr-code-title" className="mt-2 font-serif text-xl font-bold text-brand-ink">Leve a Allvino com você</h2>
          <p className="mt-2 text-sm leading-6 text-brand-ink-light">Aponte a câmera para abrir o site ou compartilhe o link.</p>
          <div className="mx-auto mt-4 flex min-h-44 items-center justify-center" aria-busy={!qrCodeUrl}>
            {qrCodeUrl ? (
              <Image src={qrCodeUrl} alt="QR Code para acessar o site da Allvino" width={176} height={176} unoptimized className="rounded-lg" />
            ) : (
              <span className="text-xs font-bold text-brand-muted">Gerando QR Code...</span>
            )}
          </div>
          <button type="button" onClick={handleShare} disabled={!siteUrl} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-brand-lg bg-brand-primary px-4 text-sm font-bold text-white transition hover:bg-brand-primary-hover disabled:opacity-50">
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Compartilhar site
          </button>
          {shareMessage && <p role="status" className="mt-3 text-xs font-semibold text-brand-ink-light">{shareMessage}</p>}
          {!supportsNativeShare && siteUrl && <p className="mt-3 inline-flex items-center gap-1 text-xs text-brand-muted"><Copy className="h-3.5 w-3.5" aria-hidden="true" /> O link será copiado.</p>}
        </section>
      </div>
    </footer>
  );
}
