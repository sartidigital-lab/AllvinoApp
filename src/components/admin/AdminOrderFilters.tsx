import { adminStatusFilters, type AdminOrderPeriod, type AdminOrderStatusFilter } from '@/lib/orders/adminFilters';

type Props = {
  period: AdminOrderPeriod;
  onPeriodChange: (period: AdminOrderPeriod) => void;
  status: AdminOrderStatusFilter;
  onStatusChange: (status: AdminOrderStatusFilter) => void;
  counts?: Partial<Record<AdminOrderStatusFilter, number>>;
};

export function AdminOrderFilters({ period, onPeriodChange, status, onStatusChange, counts }: Props) {
  const invalid = Boolean(period.start && period.end && period.start > period.end);
  return (
    <section aria-label="Filtros de pedidos" className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 sm:flex-none"><h2 className="text-sm font-bold text-stone-900">Período dos pedidos</h2><p className="mt-1 text-xs text-stone-500">Filtrado pela data de criação, incluindo os dias selecionados.</p></div>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-bold text-stone-600 sm:flex-none">De<input type="date" value={period.start} max={period.end || undefined} onChange={(event) => onPeriodChange({ ...period, start: event.target.value })} className="h-10 min-w-0 rounded-lg border border-stone-200 px-2 text-sm" /></label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-bold text-stone-600 sm:flex-none">Até<input type="date" value={period.end} min={period.start || undefined} onChange={(event) => onPeriodChange({ ...period, end: event.target.value })} className="h-10 min-w-0 rounded-lg border border-stone-200 px-2 text-sm" /></label>
        {(period.start || period.end || status !== 'all') && <button type="button" onClick={() => { onPeriodChange({ start: '', end: '' }); onStatusChange('all'); }} className="h-10 rounded-lg px-3 text-xs font-bold text-stone-600 hover:bg-stone-100">Limpar filtros</button>}
      </div>
      {invalid && <p role="alert" className="text-xs font-bold text-red-700">A data inicial deve ser anterior à data final.</p>}
      <div className="admin-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label="Situação do pedido">
        {adminStatusFilters.map((option) => <button key={option.value} type="button" aria-pressed={status === option.value} onClick={() => onStatusChange(option.value)} className={`admin-button min-h-10 shrink-0 rounded-full px-4 text-xs transition ${status === option.value ? 'bg-black text-white' : 'border border-stone-200 bg-white text-stone-500'}`}>{option.label}{counts && ` (${counts[option.value] || 0})`}</button>)}
      </div>
      <p className="text-xs text-stone-500">Pagamento confirmado pode incluir pedidos em separação ou entregues.</p>
      <p className="text-xs text-stone-500">Valor dos pedidos inclui todos os resultados; faturamento pago considera apenas pagamentos confirmados de pedidos não cancelados.</p>
    </section>
  );
}
