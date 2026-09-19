'use client';

import { useEffect, useState } from 'react';
import { PushPreferences } from '@/components/push/PushPreferences';

type Summary = { count: number; ownCount: number; configured: boolean; preview: boolean };

export default function AdminNotificationsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/catalogo');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/admin/notificacoes', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível carregar as assinaturas.');
        return response.json() as Promise<Summary>;
      })
      .then((data) => { if (active) setSummary(data); })
      .catch((error) => { if (active) setStatus(error.message); });
    return () => { active = false; };
  }, []);

  const send = async (mode: 'test' | 'campaign') => {
    if (busy || (mode === 'campaign' && !confirmed)) return;
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch('/api/admin/notificacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url, mode }),
      });
      const result = await response.json() as { error?: string; sent?: number; failed?: number; expired?: number };
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar a campanha.');
      setStatus(`${mode === 'test' ? 'Teste' : 'Campanha'} concluído: ${result.sent} aceitas, ${result.failed} falhas e ${result.expired} assinaturas expiradas.`);
      setConfirmed(false);
      setSummary((current) => current ? { ...current, count: Math.max(0, current.count - (result.expired || 0)) } : current);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível enviar a campanha.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-brand-ink">Notificações push</h1>
        <p className="mt-2 text-sm text-brand-ink-light">Envie novidades apenas para dispositivos que aceitaram notificações e entraram na conta.</p>
      </div>
      <div className="rounded-brand-xl border border-brand-border bg-brand-surface p-5 text-sm text-brand-ink-light">
        {summary ? <>
          <p><strong>{summary.count}</strong> dispositivo{summary.count === 1 ? '' : 's'} inscrito{summary.count === 1 ? '' : 's'}.</p>
          <p><strong>{summary.ownCount}</strong> da sua conta para teste controlado.</p>
          {!summary.configured && <p className="mt-2 text-brand-primary">Configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY no servidor antes de enviar.</p>}
          {summary.count > 500 && <p className="mt-2 text-brand-primary">O limite atual é de 500 dispositivos por campanha.</p>}
          {summary.preview && <p className="mt-2 text-brand-primary">Neste Preview, apenas o envio de teste para sua conta está disponível.</p>}
        </> : <p>Carregando dispositivos inscritos...</p>}
      </div>
      <PushPreferences />
      <form onSubmit={(event) => { event.preventDefault(); void send('campaign'); }} className="space-y-5 rounded-brand-xl border border-brand-border bg-brand-surface p-5 sm:p-7">
        <label className="block text-sm font-bold text-brand-ink">Título
          <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={80} className="mt-2 w-full rounded-brand-lg border border-brand-border bg-white px-3 py-3 font-normal" placeholder="Novidades da Allvino" />
        </label>
        <label className="block text-sm font-bold text-brand-ink">Mensagem
          <textarea value={body} onChange={(event) => setBody(event.target.value)} required minLength={5} maxLength={200} rows={4} className="mt-2 w-full rounded-brand-lg border border-brand-border bg-white px-3 py-3 font-normal" placeholder="Conte a novidade em até 200 caracteres." />
        </label>
        <label className="block text-sm font-bold text-brand-ink">Página ao abrir
          <input value={url} onChange={(event) => setUrl(event.target.value)} required pattern="/.*" maxLength={200} className="mt-2 w-full rounded-brand-lg border border-brand-border bg-white px-3 py-3 font-normal" />
          <span className="mt-1 block text-xs font-normal text-brand-muted">Use um caminho interno, como /catalogo.</span>
        </label>
        <label className="flex items-start gap-3 text-sm text-brand-ink-light">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
          Confirmo o envio desta mensagem para todos os dispositivos inscritos.
        </label>
        <button type="button" onClick={() => void send('test')} disabled={busy || !summary?.configured || !summary.ownCount || title.trim().length < 3 || body.trim().length < 5 || !url.startsWith('/')} className="min-h-12 rounded-brand-lg border border-brand-primary px-6 font-bold text-brand-primary disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? 'Enviando...' : 'Enviar teste para minha conta'}
        </button>
        <p className="text-xs text-brand-muted">O teste alcança somente um dispositivo vinculado à sua conta. Após ativar notificações acima, atualize a página para ver a contagem.</p>
        <button type="submit" disabled={!confirmed || busy || !summary?.configured || !summary.count || summary.count > 500 || summary.preview} className="min-h-12 rounded-brand-lg bg-brand-primary px-6 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? 'Enviando...' : 'Enviar notificações'}
        </button>
        {status && <p role="status" className="text-sm font-bold text-brand-ink-light">{status}</p>}
      </form>
    </div>
  );
}
