"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  deleteDeliveryZone,
  DeliveryZonePayload,
  fetchDeliveryZones,
  saveDeliveryZone,
} from '@/lib/database/delivery';
import { formatZipCode, normalizeZipCode } from '@/lib/delivery/rules';
import { DeliveryZone } from '@/types/database';

type DeliveryZoneForm = {
  name: string;
  zip_start: string;
  zip_end: string;
  fee: string;
  free_shipping_min_subtotal: string;
  estimate_days: string;
  is_active: boolean;
};

const emptyForm: DeliveryZoneForm = {
  name: '',
  zip_start: '',
  zip_end: '',
  fee: '0',
  free_shipping_min_subtotal: '',
  estimate_days: '1',
  is_active: true,
};

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toForm(zone: DeliveryZone): DeliveryZoneForm {
  return {
    name: zone.name,
    zip_start: formatZipCode(zone.zip_start),
    zip_end: formatZipCode(zone.zip_end),
    fee: String(zone.fee),
    free_shipping_min_subtotal: zone.free_shipping_min_subtotal ? String(zone.free_shipping_min_subtotal) : '',
    estimate_days: String(zone.estimate_days),
    is_active: zone.is_active,
  };
}

function toPayload(form: DeliveryZoneForm): DeliveryZonePayload {
  return {
    name: form.name.trim(),
    zip_start: normalizeZipCode(form.zip_start),
    zip_end: normalizeZipCode(form.zip_end),
    fee: Number(form.fee || 0),
    free_shipping_min_subtotal: form.free_shipping_min_subtotal ? Number(form.free_shipping_min_subtotal) : null,
    estimate_days: Number(form.estimate_days || 1),
    is_active: form.is_active,
  };
}

export default function AdminLogisticsPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [form, setForm] = useState<DeliveryZoneForm>(emptyForm);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadZones = async () => {
    setIsLoading(true);
    setMessage(null);

    const { zones: nextZones, error } = await fetchDeliveryZones();

    if (error) {
      setMessage('Nao foi possivel carregar as regioes. Verifique sua permissao de admin.');
    }

    setZones(nextZones);
    setIsLoading(false);
  };

  useEffect(() => {
    loadZones();
  }, []);

  const stats = useMemo(() => {
    return zones.reduce(
      (acc, zone) => {
        acc.total += 1;
        if (zone.is_active) acc.active += 1;
        if (zone.fee === 0 || zone.free_shipping_min_subtotal !== null) acc.freeRules += 1;
        return acc;
      },
      { total: 0, active: 0, freeRules: 0 }
    );
  }, [zones]);

  const openCreateForm = () => {
    setEditingZone(null);
    setForm(emptyForm);
    setIsFormOpen(true);
    setMessage(null);
  };

  const openEditForm = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setForm(toForm(zone));
    setIsFormOpen(true);
    setMessage(null);
  };

  const closeForm = () => {
    setEditingZone(null);
    setForm(emptyForm);
    setIsFormOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = toPayload(form);

    if (!payload.name || payload.zip_start.length !== 8 || payload.zip_end.length !== 8) {
      setMessage('Informe nome e faixas de CEP validas.');
      return;
    }

    if (payload.zip_start > payload.zip_end) {
      setMessage('O CEP inicial precisa ser menor ou igual ao CEP final.');
      return;
    }

    if (payload.fee < 0 || payload.estimate_days <= 0) {
      setMessage('Informe taxa e prazo validos.');
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const { zone, error } = await saveDeliveryZone(payload, editingZone?.id);

    if (error || !zone) {
      setMessage('Nao foi possivel salvar a regiao de entrega.');
      setIsSaving(false);
      return;
    }

    await loadZones();
    closeForm();
    setMessage(editingZone ? 'Regiao atualizada.' : 'Regiao criada.');
    setIsSaving(false);
  };

  const handleDelete = async (zone: DeliveryZone) => {
    if (!confirm(`Excluir a regiao ${zone.name}?`)) return;

    const wasDeleted = await deleteDeliveryZone(zone.id);
    if (!wasDeleted) {
      setMessage('Nao foi possivel excluir a regiao.');
      return;
    }

    await loadZones();
    setMessage('Regiao excluida.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif text-black">Logistica & Frete</h1>
          <p className="mt-1 text-sm font-bold text-stone-500">Configure regioes, taxas e prazos de entrega.</p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-stone-800"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Nova Regiao
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-black p-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Regioes</p>
          <p className="mt-2 text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-stone-100 bg-white p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Ativas</p>
          <p className="mt-2 text-3xl font-bold text-black">{stats.active}</p>
        </div>
        <div className="rounded-lg border border-stone-100 bg-white p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Frete gratis</p>
          <p className="mt-2 text-3xl font-bold text-black">{stats.freeRules}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={loadZones}
          className="flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 font-bold text-black transition hover:bg-stone-50"
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
          Atualizar
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-700">
          {message}
        </div>
      )}

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-stone-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-black">{editingZone ? 'Editar regiao' : 'Nova regiao'}</h2>
            <button type="button" onClick={closeForm} className="text-stone-500 hover:text-black">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-bold uppercase text-stone-400">Nome</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <label className="flex items-end gap-3 rounded-lg border border-stone-200 p-3">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} className="mb-1" />
              <span className="text-sm font-bold text-black">Ativa</span>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Prazo (dias)</span>
              <input type="number" min="1" value={form.estimate_days} onChange={(event) => setForm({ ...form, estimate_days: event.target.value })} className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">CEP inicial</span>
              <input value={form.zip_start} onChange={(event) => setForm({ ...form, zip_start: formatZipCode(event.target.value) })} className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">CEP final</span>
              <input value={form.zip_end} onChange={(event) => setForm({ ...form, zip_end: formatZipCode(event.target.value) })} className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Taxa</span>
              <input type="number" min="0" step="0.01" value={form.fee} onChange={(event) => setForm({ ...form, fee: event.target.value })} className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Gratis a partir de</span>
              <input type="number" min="0" step="0.01" value={form.free_shipping_min_subtotal} onChange={(event) => setForm({ ...form, free_shipping_min_subtotal: event.target.value })} placeholder="Opcional" className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeForm} className="rounded-lg border border-stone-200 px-4 py-2.5 font-bold text-stone-600 hover:bg-stone-50">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="rounded-lg bg-[#B91C1C] px-5 py-2.5 font-bold text-white hover:bg-red-800 disabled:opacity-60">
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-stone-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-stone-100 bg-[#FDFBF7] text-xs uppercase tracking-wider text-stone-500">
                <th className="p-4 font-bold">Regiao</th>
                <th className="p-4 font-bold">Faixa de CEP</th>
                <th className="p-4 font-bold">Frete</th>
                <th className="p-4 font-bold">Prazo</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 text-center font-bold">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center font-bold text-stone-500">Carregando regioes...</td>
                </tr>
              ) : zones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center font-bold text-stone-500">Nenhuma regiao configurada.</td>
                </tr>
              ) : zones.map((zone) => (
                <tr key={zone.id} className="transition-colors hover:bg-stone-50">
                  <td className="p-4 font-bold text-black">{zone.name}</td>
                  <td className="p-4 text-sm font-bold text-stone-500">{formatZipCode(zone.zip_start)} ate {formatZipCode(zone.zip_end)}</td>
                  <td className="p-4">
                    <p className="font-bold text-black">{formatMoney(zone.fee)}</p>
                    {zone.free_shipping_min_subtotal !== null && (
                      <p className="text-xs font-bold text-emerald-700">Gratis acima de {formatMoney(zone.free_shipping_min_subtotal)}</p>
                    )}
                  </td>
                  <td className="p-4 text-sm font-bold text-stone-500">Ate {zone.estimate_days} dia(s)</td>
                  <td className="p-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${zone.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                      {zone.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openEditForm(zone)} className="p-1 text-blue-500 hover:text-blue-700" title="Editar">
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button onClick={() => handleDelete(zone)} className="p-1 text-red-500 hover:text-red-700" title="Excluir">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
