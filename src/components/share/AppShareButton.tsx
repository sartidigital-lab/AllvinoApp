"use client";

import { useEffect, useRef, useState } from 'react';
import { Camera, MessageCircle, Share2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { IconButton } from '@/components/ui';

const shareTitle = 'Allvino App';
const shareText = 'Conheca a Allvino, sua adega digital de vinhos premium.';

function getShareUrl() {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/`;
}

function getWhatsAppUrl() {
  const message = [shareText, '', getShareUrl()].join('\n');
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

async function copyShareLink() {
  const url = getShareUrl();

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(`${shareText}\n${url}`);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = `${shareText}\n${url}`;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function AppShareButton() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  const shareOnInstagram = async () => {
    const shareData = {
      title: shareTitle,
      text: shareText,
      url: getShareUrl(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setIsOpen(false);
        return;
      }

      await copyShareLink();
      showToast('Link copiado para compartilhar no Instagram', 'success');
      window.open('https://www.instagram.com/direct/inbox/', '_blank', 'noopener,noreferrer');
      setIsOpen(false);
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        showToast('Nao foi possivel compartilhar agora', 'error');
      }
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <IconButton
        icon={<Share2 className="h-5 w-5" aria-hidden="true" />}
        aria-label="Compartilhar aplicativo"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((current) => !current)}
      />

      {isOpen && (
        <div
          role="menu"
          className="absolute left-0 top-12 z-[90] w-56 overflow-hidden rounded-2xl border border-stone-100 bg-white p-2 shadow-xl shadow-black/10"
        >
          <a
            role="menuitem"
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
          >
            <MessageCircle className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            WhatsApp
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={shareOnInstagram}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-stone-700 transition hover:bg-stone-50"
          >
            <Camera className="h-5 w-5 text-pink-600" aria-hidden="true" />
            Instagram
          </button>
        </div>
      )}
    </div>
  );
}
