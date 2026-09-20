'use client';

import { useEffect, useMemo, useState } from 'react';
import { PushPreferences } from '@/components/push/PushPreferences';

type AudienceUser = {
  user_id: string;
  user_name: string;
  user_email: string | null;
  registered_at: string;
  notifications_enabled: boolean;
  device_count: number;
  device_types: string[] | null;
  has_orders: boolean;
  last_order_at: string | null;
  days_without_purchase: number;
  average_bottle_price: number | string | null;
  average_order_ticket: number | string | null;
};

type Summary = {
  count: number;
  ownCount: number;
  configured: boolean;
  preview: boolean;
  users: AudienceUser[];
};

type AudienceMode = 'full' | 'ticket';

function formatMoney(value: number | string | null) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR');
}

function getDeviceLabel(user: AudienceUser) {
  if (!user.notifications_enabled) return '—';
  if (!user.device_types?.length) return 'Não identificado';
  return user.device_types.map((type) => type === 'mobile' ? 'Mobile' : 'Desktop').join(' · ');
}

export default function AdminNotificationsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/catalogo');
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('full');
  const [ticketMin, setTicketMin] = useState('');
  const [ticketMax, setTicketMax] = useState('');
  const [search, setSearch] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const loadAudience = async () => {
    const response = await fetch('/api/admin/notificacoes', { cache: 'no-store' });
    const data = await response.json() as Summary & { error?: string };
    if (!response.ok) throw new Error(data.error || 'Não foi possível carregar a base de usuários.');
    setSummary({ ...data, users: Array.isArray(data.users) ? data.users : [] });
  };

  useEffect(() => {
    void loadAudience().catch((error) => setStatus(error instanceof Error ? error.message : 'Não foi possível carregar a base de usuários.'));
  }, []);

  const ticketLimitsAreValid = useMemo(() => {
    if (audienceMode !== 'ticket') return true;
    const min = ticketMin === '' ? null : Number(ticketMin);
    const max = ticketMax === '' ? null : Number(ticketMax);
    return Number.isFinite(min ?? 0) && Number.isFinite(max ?? 0) && (min !== null || max !== null) && (min === null || max === null || min <= max);
  }, [audienceMode, ticketMax, ticketMin]);

  const campaignUsers = useMemo(() => {
    if (!summary) return [];
    const min = ticketMin === '' ? null : Number(ticketMin);
    const max = ticketMax === '' ? null : Number(ticketMax);
    return summary.users.filter((user) => {
      if (!user.notifications_enabled) return false;
      if (audienceMode === 'full') return true;
      const ticket = user.average_order_ticket === null ? null : Number(user.average_order_ticket);
      return user.has_orders && ticket !== null && (min === null || ticket >= min) && (max === null || ticket <= max);
    });
  }, [audienceMode, summary, ticketMax, ticketMin]);

  const visibleUsers = useMemo(() => {
    if (!summary) return [];
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return summary.users;
    return summary.users.filter((user) => [user.user_name, user.user_email || ''].join(' ').toLocaleLowerCase('pt-BR').includes(term));
  }, [search, summary]);

  const enabledUsers = summary?.users.filter((user) => user.notifications_enabled).length || 0;
  const usersWithOrders = summary?.users.filter((user) => user.has_orders).length || 0;
  const campaignDeviceCount = campaignUsers.reduce((total, user) => total + user.device_count, 0);

  const send = async (mode: 'test' | 'campaign') => {
    if (busy || (mode === 'campaign' && (!confirmed || !ticketLimitsAreValid))) return;
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch('/api/admin/notificacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          url,
          mode,
          audience: mode === 'test' ? 'full' : audienceMode,
          ticketMin: audienceMode === 'ticket' && ticketMin !== '' ? Number(ticketMin) : null,
          ticketMax: audienceMode === 'ticket' && ticketMax !== '' ? Number(ticketMax) : null,
        }),
      });
      const result = await response.json() as { error?: string; sent?: number; failed?: number; expired?: number };
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar a campanha.');
      setStatus(`${mode === 'test' ? 'Teste' : 'Campanha'} concluído: ${result.sent} aceitas, ${result.failed} falhas e ${result.expired} assinaturas expiradas.`);
      setConfirmed(false);
      if (result.expired) await loadAudience();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível enviar a campanha.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-brand-ink">Notificações push</h1>
          <p className="mt-2 text-sm text-brand-ink-light">Mapeie a base cadastrada, acompanhe a recorrência de compra e envie campanhas segmentadas.</p>
        </div>
        <button type="button" onClick={() => void loadAudience().catch((error) => setStatus(error instanceof Error ? error.message : 'Não foi possível atualizar a base.'))} className="min-h-11 rounded-brand-lg border border-brand-border bg-white px-4 text-sm font-bold text-brand-ink hover:border-brand-primary">
          Atualizar dados
        </button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo de notificações">
        <Metric label="Base cadastrada" value={summary ? summary.users.length : '—'} detail="Contas de clientes ativas" />
        <Metric label="Notificações habilitadas" value={summary ? enabledUsers : '—'} detail={summary ? `${summary.users.length - enabledUsers} não habilitaram` : '—'} />
        <Metric label="Dispositivos inscritos" value={summary ? summary.count : '—'} detail="Um usuário pode ter mais de um dispositivo" />
        <Metric label="Clientes com pedido" value={summary ? usersWithOrders : '—'} detail="Histórico válido de compra" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-brand-xl border border-brand-border bg-brand-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border p-5">
            <div><h2 className="font-serif text-xl font-bold text-brand-ink">Base de usuários</h2><p className="mt-1 text-sm text-brand-ink-light">Dados de compra e permissões por conta.</p></div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuário ou e-mail" className="min-h-10 rounded-brand-lg border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-primary" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[1000px] w-full text-left text-sm">
              <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500"><tr><th className="px-5 py-3">Usuário</th><th className="px-4 py-3">Notificações</th><th className="px-4 py-3">Dispositivo</th><th className="px-4 py-3">Pedidos / Recorrência</th><th className="px-4 py-3">Preço médio garrafa</th><th className="px-5 py-3">Ticket médio</th></tr></thead>
              <tbody className="divide-y divide-brand-border">
                {!summary && <tr><td colSpan={6} className="px-5 py-10 text-center text-brand-ink-light">Carregando usuários...</td></tr>}
                {summary && visibleUsers.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-brand-ink-light">Nenhum usuário encontrado.</td></tr>}
                {visibleUsers.map((user) => <AudienceRow key={user.user_id} user={user} />)}
              </tbody>
            </table>
          </div>
          {summary?.users.some((user) => user.notifications_enabled && !user.device_types?.length) && <p className="border-t border-brand-border px-5 py-3 text-xs text-brand-muted">Assinaturas registradas antes desta atualização podem aparecer como “Não identificado” até que o dispositivo habilite novamente as notificações.</p>}
        </section>

        <div className="space-y-6">
          <PushPreferences />
          <form onSubmit={(event) => { event.preventDefault(); void send('campaign'); }} className="space-y-5 rounded-brand-xl border border-brand-border bg-brand-surface p-5 sm:p-6">
            <div><h2 className="font-serif text-xl font-bold text-brand-ink">Nova campanha</h2><p className="mt-1 text-sm text-brand-ink-light">Envios acontecem somente para dispositivos habilitados.</p></div>
            <fieldset className="space-y-3"><legend className="text-sm font-bold text-brand-ink">Público</legend>
              <AudienceOption selected={audienceMode === 'full'} onChange={() => setAudienceMode('full')} title="Full" detail="Toda a base com notificações habilitadas." />
              <AudienceOption selected={audienceMode === 'ticket'} onChange={() => setAudienceMode('ticket')} title="Por ticket médio" detail="Somente clientes com pedido dentro da faixa." />
            </fieldset>
            {audienceMode === 'ticket' && <div className="grid grid-cols-2 gap-3"><MoneyField label="Ticket mínimo" value={ticketMin} onChange={setTicketMin} placeholder="Ex.: 150" /><MoneyField label="Ticket máximo" value={ticketMax} onChange={setTicketMax} placeholder="Opcional" />{!ticketLimitsAreValid && <p className="col-span-2 text-xs font-bold text-brand-primary">Informe uma faixa de ticket válida.</p>}</div>}
            <div className="rounded-brand-lg bg-stone-50 p-3 text-sm"><p className="font-bold text-brand-ink">Prévia do público</p><p className="mt-1 text-brand-ink-light">{campaignUsers.length} usuário{campaignUsers.length === 1 ? '' : 's'} · {campaignDeviceCount} dispositivo{campaignDeviceCount === 1 ? '' : 's'}.</p>{campaignDeviceCount > 500 && <p className="mt-1 text-xs font-bold text-brand-primary">O limite atual é de 500 dispositivos por campanha. Refine o segmento.</p>}</div>
            <label className="block text-sm font-bold text-brand-ink">Título<input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={80} className="mt-2 w-full rounded-brand-lg border border-brand-border bg-white px-3 py-3 font-normal" placeholder="Novidades da Allvino" /></label>
            <label className="block text-sm font-bold text-brand-ink">Mensagem<textarea value={body} onChange={(event) => setBody(event.target.value)} required minLength={5} maxLength={200} rows={4} className="mt-2 w-full rounded-brand-lg border border-brand-border bg-white px-3 py-3 font-normal" placeholder="Conte a novidade em até 200 caracteres." /></label>
            <label className="block text-sm font-bold text-brand-ink">Página ao abrir<input value={url} onChange={(event) => setUrl(event.target.value)} required pattern="/.*" maxLength={200} className="mt-2 w-full rounded-brand-lg border border-brand-border bg-white px-3 py-3 font-normal" /><span className="mt-1 block text-xs font-normal text-brand-muted">Use um caminho interno, como /catalogo.</span></label>
            <label className="flex items-start gap-3 text-sm text-brand-ink-light"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />Confirmo o envio para {audienceMode === 'full' ? 'toda a base habilitada' : 'o segmento por ticket médio'}.</label>
            <button type="button" onClick={() => void send('test')} disabled={busy || !summary?.configured || !summary.ownCount || title.trim().length < 3 || body.trim().length < 5 || !url.startsWith('/')} className="min-h-11 w-full rounded-brand-lg border border-brand-primary px-5 text-sm font-bold text-brand-primary disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Enviando...' : 'Enviar teste para minha conta'}</button>
            <button type="submit" disabled={!confirmed || busy || !summary?.configured || !campaignDeviceCount || campaignDeviceCount > 500 || summary.preview || !ticketLimitsAreValid} className="min-h-12 w-full rounded-brand-lg bg-brand-primary px-6 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Enviando...' : 'Enviar notificações'}</button>
            {!summary?.configured && <p className="text-xs font-bold text-brand-primary">Configure as chaves VAPID no servidor antes de enviar.</p>}
            {summary?.preview && <p className="text-xs font-bold text-brand-primary">Em Preview, somente o envio de teste está disponível.</p>}
            {status && <p role="status" className="text-sm font-bold text-brand-ink-light">{status}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return <div className="rounded-brand-xl border border-brand-border bg-brand-surface p-5"><p className="text-xs font-bold uppercase tracking-wider text-brand-muted">{label}</p><p className="mt-2 text-3xl font-bold text-brand-ink">{value}</p><p className="mt-1 text-xs text-brand-ink-light">{detail}</p></div>;
}

function AudienceRow({ user }: { user: AudienceUser }) {
  return <tr className="align-top text-brand-ink"><td className="px-5 py-4"><p className="font-bold">{user.user_name}</p><p className="mt-1 text-xs text-brand-muted">{user.user_email || 'E-mail não informado'}</p></td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${user.notifications_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>{user.notifications_enabled ? 'Habilitadas' : 'Não habilitadas'}</span><p className="mt-1 text-xs text-brand-muted">{user.notifications_enabled ? `${user.device_count} dispositivo${user.device_count === 1 ? '' : 's'}` : 'Sem assinatura push'}</p></td><td className="px-4 py-4 font-medium">{getDeviceLabel(user)}</td><td className="px-4 py-4"><p className="font-bold">{user.has_orders ? 'Já fez pedido' : 'Ainda não comprou'}</p><p className="mt-1 text-xs text-brand-muted">{user.has_orders && user.last_order_at ? `Última compra: ${formatDate(user.last_order_at)} · ${user.days_without_purchase} dias` : `Cadastro: ${formatDate(user.registered_at)} · ${user.days_without_purchase} dias`}</p></td><td className="px-4 py-4 font-bold">{user.has_orders ? formatMoney(user.average_bottle_price) : '—'}</td><td className="px-5 py-4 font-bold">{user.has_orders ? formatMoney(user.average_order_ticket) : '—'}</td></tr>;
}

function AudienceOption({ selected, onChange, title, detail }: { selected: boolean; onChange: () => void; title: string; detail: string }) {
  return <label className={`block cursor-pointer rounded-brand-lg border p-3 ${selected ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border'}`}><input className="mr-2" type="radio" name="audience" checked={selected} onChange={onChange} /><span className="font-bold text-sm text-brand-ink">{title}</span><span className="mt-1 block pl-5 text-xs text-brand-ink-light">{detail}</span></label>;
}

function MoneyField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="text-xs font-bold text-brand-ink">{label}<input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-brand-lg border border-brand-border bg-white px-3 py-2 text-sm font-normal" /></label>;
}
