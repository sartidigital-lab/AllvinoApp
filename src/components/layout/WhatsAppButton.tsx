import Image from 'next/image';

const SALES_WHATSAPP_NUMBER = '5527992770952';
const message = encodeURIComponent('Olá, Allvino! Gostaria de falar com a equipe.');

export function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${SALES_WHATSAPP_NUMBER}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a Allvino pelo WhatsApp (abre em nova aba)"
      className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 z-[80] inline-flex min-h-14 items-center gap-2 rounded-full bg-brand-whatsapp px-4 text-sm font-extrabold text-white shadow-brand-lg transition hover:bg-brand-whatsapp-hover focus-visible:outline-white sm:bottom-6 sm:right-6 md:bottom-8 md:right-8"
    >
      <Image src="/whatsapp-icon.svg" alt="" width={26} height={30} className="h-6 w-6" aria-hidden="true" />
      <span>WhatsApp</span>
    </a>
  );
}
