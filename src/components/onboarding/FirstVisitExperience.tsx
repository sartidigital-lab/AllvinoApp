'use client';

import { Wine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FIRST_VISIT_STORAGE_KEY, readFirstVisitStep, type FirstVisitStep } from '@/lib/onboarding/firstVisit';

function saveStep(step: FirstVisitStep) {
  try {
    window.localStorage.setItem(FIRST_VISIT_STORAGE_KEY, step);
  } catch {
    // Private browsing may prevent persistence; the current visit can still continue.
  }
}

export function FirstVisitExperience() {
  const [step, setStep] = useState<FirstVisitStep>('done');
  const [ready, setReady] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext) {
      void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => registration.update())
        .catch(() => undefined);
    }

    try {
      setStep(readFirstVisitStep(window.localStorage.getItem(FIRST_VISIT_STORAGE_KEY)));
    } catch {
      setStep('age');
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || step === 'done') return;
    previousFocus.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled)')];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus.current?.focus();
    };
  }, [ready, step]);

  const goTo = (next: FirstVisitStep) => {
    saveStep(next);
    setStep(next);
  };

  if (!ready || step === 'done') return null;

  const isUnderage = step === 'underage';
  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center bg-brand-ink/75 p-4 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="first-visit-title" aria-describedby="first-visit-description" className="w-full max-w-md rounded-brand-2xl border border-brand-border bg-brand-bg px-6 py-8 text-center shadow-brand-lg sm:px-9">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary"><Wine className="h-8 w-8" aria-hidden="true" /></div>
        <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.3em] text-brand-primary">Verificação de idade</p>
        <h2 id="first-visit-title" className="font-serif text-2xl font-bold leading-snug text-brand-ink sm:text-3xl">{isUnderage ? 'Acesso restrito a maiores de 18 anos' : 'Você tem 18 anos ou mais?'}</h2>
        <div className="mx-auto my-5 h-px w-16 bg-brand-primary/50" aria-hidden="true" />
        {isUnderage ? (
          <><p id="first-visit-description" className="text-sm leading-6 text-brand-ink-light">A venda de bebidas alcoólicas é proibida para menores de 18 anos. Você não pode continuar no catálogo.</p><button type="button" onClick={() => goTo('age')} className="mt-7 min-h-12 w-full rounded-brand-lg border border-brand-primary/30 bg-brand-surface px-4 font-bold text-brand-primary">Corrigir resposta</button></>
        ) : (
          <><p id="first-visit-description" className="text-sm leading-6 text-brand-ink-light">A Allvino comercializa bebidas alcoólicas. Confirme sua idade para continuar navegando.</p><div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2"><button type="button" onClick={() => goTo('underage')} className="min-h-12 rounded-brand-lg border border-brand-primary/30 bg-brand-surface px-3 text-sm font-bold text-brand-ink">Sou menor de 18</button><button type="button" onClick={() => goTo('done')} className="min-h-12 rounded-brand-lg bg-brand-primary px-3 text-sm font-bold text-white shadow-brand-sm hover:bg-brand-primary-hover">Tenho 18 anos ou mais</button></div><p className="mt-7 text-xs leading-5 text-brand-muted">Beba com moderação. Venda proibida para menores de 18 anos.</p></>
        )}
      </div>
    </div>
  );
}
