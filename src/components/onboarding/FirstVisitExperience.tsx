'use client';

import Image from 'next/image';
import { Bell, Download, MapPin, ShieldCheck, Wine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { FIRST_VISIT_STORAGE_KEY, nextFirstVisitStep, readFirstVisitStep, type FirstVisitStep } from '@/lib/onboarding/firstVisit';
import { registerPushSubscription } from '@/lib/push/client';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isInstalled() {
  return (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

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
  const [installAvailable, setInstallAvailable] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');
  const installPrompt = useRef<InstallPromptEvent | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    try {
      setStep(readFirstVisitStep(window.localStorage.getItem(FIRST_VISIT_STORAGE_KEY)));
    } catch {
      setStep('age');
    }
    setReady(true);

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      installPrompt.current = event as InstallPromptEvent;
      setInstallAvailable(true);
    };
    const onInstalled = () => {
      installPrompt.current = null;
      setInstallAvailable(false);
    };
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!ready || step === 'done') return;
    previousFocus.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')];
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

  useEffect(() => {
    if (step === 'install' && isInstalled()) {
      saveStep('notifications');
      setStep('notifications');
    }
    if (step === 'notifications' && (!('Notification' in window) || Notification.permission !== 'default')) {
      saveStep('done');
      setStep('done');
    }
  }, [step]);

  const goTo = (next: FirstVisitStep) => {
    setPermissionMessage('');
    saveStep(next);
    setStep(next);
  };
  const continueFlow = () => goTo(nextFirstVisitStep(step));

  const requestLocation = () => {
    if (!navigator.geolocation || !window.isSecureContext) {
      setPermissionMessage('A localização não está disponível neste navegador. Você pode continuar sem ela.');
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationBusy(false);
        continueFlow();
      },
      () => {
        setLocationBusy(false);
        setPermissionMessage('A localização não foi autorizada. Você pode continuar normalmente.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );
  };

  const requestInstall = async () => {
    const prompt = installPrompt.current;
    if (!prompt) return;
    installPrompt.current = null;
    setInstallAvailable(false);
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      // Browser may no longer allow the prompt; manual instructions remain available.
    }
    continueFlow();
  };

  const requestNotifications = async () => {
    if (!('Notification' in window) || !window.isSecureContext) {
      continueFlow();
      return;
    }
    setNotificationBusy(true);
    setPermissionMessage('');
    try {
      const response = await fetch('/api/push/config', { cache: 'no-store' });
      const config = response.ok ? await response.json() as { available: boolean } : { available: false };
      if (!config.available) {
        setPermissionMessage('As notificações ainda não estão disponíveis. Você pode continuar sem elas.');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') await registerPushSubscription();
      continueFlow();
    } catch {
      setPermissionMessage('Não foi possível ativar as notificações agora. Tente novamente mais tarde.');
    } finally {
      setNotificationBusy(false);
    }
  };

  if (!ready || step === 'done') return null;

  const isAgeStep = step === 'age' || step === 'underage';
  const title = step === 'age' ? 'Você tem 18 anos ou mais?'
    : step === 'underage' ? 'Acesso restrito a maiores de 18 anos'
    : step === 'location' ? 'Podemos acessar sua localização?'
    : step === 'install' ? 'Leve a Allvino com você'
    : 'Deseja permitir notificações?';

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center bg-brand-ink/75 p-4 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="first-visit-title" aria-describedby="first-visit-description" className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-brand-2xl border border-brand-border bg-brand-bg px-6 py-8 text-center shadow-brand-lg sm:px-9">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
          {step === 'location' ? <MapPin className="h-8 w-8" aria-hidden="true" />
            : step === 'install' ? <Image src="/icon-192.png" alt="" width={48} height={48} className="rounded-brand-lg" />
            : step === 'notifications' ? <Bell className="h-8 w-8" aria-hidden="true" />
            : <Wine className="h-8 w-8" aria-hidden="true" />}
        </div>
        <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.3em] text-brand-primary">
          {isAgeStep ? 'Verificação de idade' : 'Boas-vindas à Allvino'}
        </p>
        <h2 id="first-visit-title" className="font-serif text-2xl font-bold leading-snug text-brand-ink sm:text-3xl">{title}</h2>
        <div className="mx-auto my-5 h-px w-16 bg-brand-primary/50" aria-hidden="true" />

        {step === 'age' && <>
          <p id="first-visit-description" className="text-sm leading-6 text-brand-ink-light">A Allvino comercializa bebidas alcoólicas. Confirme sua idade para continuar navegando.</p>
          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => goTo('underage')} className="min-h-12 rounded-brand-lg border border-brand-primary/30 bg-brand-surface px-3 text-sm font-bold text-brand-ink">Sou menor de 18</button>
            <button type="button" onClick={() => goTo('location')} className="min-h-12 rounded-brand-lg bg-brand-primary px-3 text-sm font-bold text-white shadow-brand-sm hover:bg-brand-primary-hover">Tenho 18 anos ou mais</button>
          </div>
          <p className="mt-7 text-xs leading-5 text-brand-muted">Beba com moderação. Venda proibida para menores de 18 anos.</p>
        </>}

        {step === 'underage' && <>
          <p id="first-visit-description" className="text-sm leading-6 text-brand-ink-light">A venda de bebidas alcoólicas é proibida para menores de 18 anos. Você não pode continuar no catálogo.</p>
          <button type="button" onClick={() => goTo('age')} className="mt-7 min-h-12 w-full rounded-brand-lg border border-brand-primary/30 bg-brand-surface px-4 font-bold text-brand-primary">Corrigir resposta</button>
        </>}

        {step === 'location' && <>
          <p id="first-visit-description" className="text-sm leading-6 text-brand-ink-light">Com sua autorização, podemos identificar sua região para futuras experiências locais. Sua posição exata não será salva nesta etapa.</p>
          {permissionMessage && <p role="status" className="mt-4 text-xs font-bold text-brand-primary">{permissionMessage}</p>}
          <button type="button" onClick={requestLocation} disabled={locationBusy} className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-brand-lg bg-brand-primary px-4 font-bold text-white hover:bg-brand-primary-hover disabled:opacity-60"><MapPin className="h-5 w-5" aria-hidden="true" />{locationBusy ? 'Aguardando permissão...' : 'Permitir localização'}</button>
          <button type="button" onClick={continueFlow} className="mt-3 min-h-11 w-full text-sm font-bold text-brand-muted">Agora não</button>
        </>}

        {step === 'install' && <>
          <p id="first-visit-description" className="text-sm leading-6 text-brand-ink-light">Instale o aplicativo Allvino para acessar o catálogo diretamente da tela inicial do seu dispositivo.</p>
          {installAvailable ? (
            <button type="button" onClick={requestInstall} className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-brand-lg bg-brand-primary px-4 font-bold text-white hover:bg-brand-primary-hover"><Download className="h-5 w-5" aria-hidden="true" />Instalar aplicativo</button>
          ) : (
            <p className="mt-6 rounded-brand-lg border border-brand-border bg-brand-surface-elevated p-4 text-left text-xs leading-5 text-brand-ink-light">Se o navegador não oferecer a instalação automática, abra o menu do navegador e escolha <strong>Instalar aplicativo</strong> ou, no Safari do iPhone, <strong>Compartilhar → Adicionar à Tela de Início</strong>.</p>
          )}
          <button type="button" onClick={continueFlow} className="mt-4 min-h-11 w-full text-sm font-bold text-brand-muted">Continuar sem instalar</button>
        </>}

        {step === 'notifications' && <>
          <p id="first-visit-description" className="text-sm leading-6 text-brand-ink-light">Você pode autorizar notificações da Allvino. O dispositivo será inscrito quando você entrar na sua conta, e poderá receber avisos enviados pela nossa equipe.</p>
          <p className="mt-4 text-xs leading-5 text-brand-muted">O navegador controla a permissão. No iPhone, ela pode exigir que o aplicativo esteja instalado na tela inicial.</p>
          {permissionMessage && <p role="status" className="mt-4 text-xs font-bold text-brand-primary">{permissionMessage}</p>}
          <button type="button" onClick={requestNotifications} disabled={notificationBusy} className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-brand-lg bg-brand-primary px-4 font-bold text-white hover:bg-brand-primary-hover disabled:opacity-60"><ShieldCheck className="h-5 w-5" aria-hidden="true" />{notificationBusy ? 'Ativando...' : 'Permitir notificações'}</button>
          <button type="button" onClick={continueFlow} className="mt-3 min-h-11 w-full text-sm font-bold text-brand-muted">Agora não</button>
        </>}
      </div>
    </div>
  );
}
