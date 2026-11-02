'use client';

import { useEffect, useState } from 'react';
import { registerPushSubscription, unregisterPushSubscription } from '@/lib/push/client';

export function PushPreferences() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistration('/sw.js')
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => setEnabled(Boolean(subscription)))
      .catch(() => undefined);
  }, []);

  const enable = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (!window.isSecureContext || !('Notification' in window) || !('PushManager' in window)) {
        throw new Error('Este navegador não oferece notificações push para o aplicativo.');
      }
      const response = await fetch('/api/push/config', { cache: 'no-store' });
      const config = response.ok ? await response.json() as { available: boolean } : { available: false };
      if (!config.available) throw new Error('As notificações ainda não estão configuradas.');
      const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      if (permission !== 'granted') throw new Error('Ative as notificações nas configurações do navegador para continuar.');
      const result = await registerPushSubscription();
      if (result !== 'subscribed') throw new Error(result === 'login-required' ? 'Entre na conta para ativar as notificações.' : 'Notificações indisponíveis neste dispositivo.');
      setEnabled(true);
      setMessage('Notificações ativadas neste dispositivo.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível ativar as notificações.');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setMessage('');
    try {
      await unregisterPushSubscription();
      setEnabled(false);
      setMessage('Notificações desativadas neste dispositivo.');
    } catch {
      setMessage('Não foi possível desativar as notificações agora.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-brand-xl border border-brand-border bg-brand-surface p-6">
      <h2 className="font-serif text-xl font-bold text-brand-ink">Notificações</h2>
      <p className="text-sm text-brand-ink-light">Escolha se este dispositivo pode receber novidades da Allvino.</p>
      <button type="button" onClick={enabled ? disable : enable} disabled={busy} className="min-h-11 rounded-brand-lg border border-brand-primary px-5 text-sm font-bold text-brand-primary disabled:opacity-50">
        {busy ? 'Aguarde...' : enabled ? 'Desativar neste dispositivo' : 'Ativar neste dispositivo'}
      </button>
      {message && <p role="status" className="text-sm text-brand-ink-light">{message}</p>}
    </section>
  );
}
