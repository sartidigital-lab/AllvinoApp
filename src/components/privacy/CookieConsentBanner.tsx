'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  COOKIE_CONSENT_PREFERENCES_EVENT,
  createCookieConsent,
  DEFAULT_COOKIE_CATEGORIES,
  readCookieConsent,
  saveCookieConsent,
  type CookieConsent,
  type CookieConsentCategories,
} from '@/lib/privacy/cookieConsent';

type OptionalCookieCategory = Exclude<keyof CookieConsentCategories, 'necessary'>;

const optionalCategories: Array<{ key: OptionalCookieCategory; title: string; description: string }> = [
  { key: 'preferences', title: 'Preferências', description: 'Mantêm escolhas como itens favoritos e recursos personalizados.' },
  { key: 'analytics', title: 'Medição', description: 'Ajudam a entender o uso do site para melhorar a experiência.' },
  { key: 'marketing', title: 'Marketing', description: 'Permitem comunicações e campanhas mais relevantes.' },
];

function notifyConsentChange(consent: CookieConsent) {
  window.dispatchEvent(new CustomEvent('allvino:cookie-consent', { detail: consent }));
}

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [draft, setDraft] = useState<CookieConsentCategories>(DEFAULT_COOKIE_CATEGORIES);

  useEffect(() => {
    const savedConsent = readCookieConsent(document.cookie);
    setConsent(savedConsent);
    setDraft(savedConsent?.categories || DEFAULT_COOKIE_CATEGORIES);
    setIsReady(true);

    const openPreferences = () => {
      const latestConsent = readCookieConsent(document.cookie);
      setConsent(latestConsent);
      setDraft(latestConsent?.categories || DEFAULT_COOKIE_CATEGORIES);
      setShowPreferences(true);
    };

    window.addEventListener(COOKIE_CONSENT_PREFERENCES_EVENT, openPreferences);
    return () => window.removeEventListener(COOKIE_CONSENT_PREFERENCES_EVENT, openPreferences);
  }, []);

  const savePreferences = (categories: Partial<CookieConsentCategories>) => {
    const nextConsent = createCookieConsent(categories);
    saveCookieConsent(nextConsent);
    setConsent(nextConsent);
    setDraft(nextConsent.categories);
    setShowPreferences(false);
    notifyConsentChange(nextConsent);
  };

  const closePreferences = () => {
    if (consent) setShowPreferences(false);
    else setShowPreferences(false);
  };

  if (!isReady) return null;

  return (
    <>
      {!consent && !showPreferences && (
        <section aria-labelledby="cookie-consent-title" className="fixed inset-x-3 bottom-3 z-[700] mx-auto max-w-3xl rounded-brand-2xl border border-brand-border bg-white p-5 shadow-brand-lg sm:bottom-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-brand-primary">Sua privacidade</p>
              <h2 id="cookie-consent-title" className="mt-1 text-lg font-bold text-brand-ink">Como a Allvino utiliza cookies</h2>
              <p className="mt-2 text-sm leading-6 text-brand-ink-light">Usamos cookies necessários para manter o site seguro e funcionando. Você pode autorizar ou recusar as categorias opcionais a qualquer momento.</p>
              <Link href="/privacidade" className="mt-2 inline-flex text-sm font-bold text-brand-primary underline underline-offset-4">Conhecer a política de privacidade</Link>
            </div>
            <div className="grid w-full gap-2 sm:w-auto sm:min-w-52">
              <button type="button" onClick={() => savePreferences({ preferences: true, analytics: true, marketing: true })} className="min-h-11 rounded-brand-lg bg-brand-primary px-4 text-sm font-bold text-white shadow-brand-sm hover:bg-brand-primary-hover">Aceitar todos</button>
              <button type="button" onClick={() => savePreferences({})} className="min-h-11 rounded-brand-lg border border-brand-border bg-white px-4 text-sm font-bold text-brand-ink hover:bg-brand-surface-elevated">Recusar opcionais</button>
              <button type="button" onClick={() => setShowPreferences(true)} className="min-h-10 px-4 text-sm font-bold text-brand-primary hover:underline">Personalizar</button>
            </div>
          </div>
        </section>
      )}

      {showPreferences && (
        <div className="fixed inset-0 z-[750] flex items-center justify-center bg-brand-ink/60 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="cookie-preferences-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-brand-2xl border border-brand-border bg-white shadow-brand-lg">
            <div className="border-b border-brand-border px-5 py-5 sm:px-6">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-brand-primary">Preferências de privacidade</p>
              <h2 id="cookie-preferences-title" className="mt-1 text-xl font-bold text-brand-ink">Escolha os cookies opcionais</h2>
              <p className="mt-2 text-sm leading-6 text-brand-ink-light">Os cookies necessários não podem ser desativados, pois são usados para segurança, carrinho e recursos essenciais da loja.</p>
            </div>
            <div className="space-y-3 px-5 py-5 sm:px-6">
              <div className="rounded-brand-lg border border-brand-border bg-brand-surface-elevated p-4">
                <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-brand-ink">Necessários</p><p className="mt-1 text-xs leading-5 text-brand-muted">Segurança, sessão e funcionamento básico do site.</p></div><span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">Sempre ativos</span></div>
              </div>
              {optionalCategories.map((category) => (
                <label key={category.key} className="flex cursor-pointer items-start justify-between gap-4 rounded-brand-lg border border-brand-border bg-white p-4 hover:border-brand-primary">
                  <span><span className="block text-sm font-bold text-brand-ink">{category.title}</span><span className="mt-1 block text-xs leading-5 text-brand-muted">{category.description}</span></span>
                  <input type="checkbox" checked={draft[category.key]} onChange={(event) => setDraft((current) => ({ ...current, [category.key]: event.target.checked }))} className="mt-1 h-5 w-5 shrink-0 rounded border-stone-300 text-brand-primary focus:ring-0" />
                </label>
              ))}
            </div>
            <div className="grid gap-2 border-t border-brand-border bg-brand-surface-elevated p-5 sm:grid-cols-2 sm:px-6">
              <button type="button" onClick={() => savePreferences(draft)} className="min-h-11 rounded-brand-lg bg-brand-primary px-4 text-sm font-bold text-white hover:bg-brand-primary-hover">Salvar preferências</button>
              <button type="button" onClick={closePreferences} className="min-h-11 rounded-brand-lg border border-brand-border bg-white px-4 text-sm font-bold text-brand-ink hover:bg-stone-50">Voltar</button>
            </div>
          </section>
        </div>
      )}

      {consent && !showPreferences && (
        <button type="button" onClick={() => setShowPreferences(true)} aria-label="Gerenciar preferências de cookies" title="Preferências de cookies" className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-4 z-[80] flex h-12 w-12 items-center justify-center rounded-full border border-brand-border bg-white text-brand-ink shadow-brand-md transition hover:bg-brand-surface-elevated" >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">cookie</span>
        </button>
      )}
    </>
  );
}
