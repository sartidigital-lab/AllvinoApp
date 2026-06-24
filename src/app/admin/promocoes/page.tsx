"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  deletePromotion,
  fetchPromotions,
  normalizePromotionCode,
  PromotionPayload,
  savePromotion,
} from '@/lib/database/promotions';
import { Promotion } from '@/types/database';

type PromotionForm = {
  code: string;
  title: string;
  description: string;
  discount_type: 'percent' | 'fixed';
  discount_value: string;
  min_subtotal: string;
  max_discount: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const emptyForm: PromotionForm = {
  code: '',
  title: '',
  description: '',
  discount_type: 'percent',
  discount_value: '10',
  min_subtotal: '0',
  max_discount: '',
  starts_at: '',
  ends_at: '',
  is_active: true,
};

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateTime(value: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 16);
}

function toForm(promotion: Promotion): PromotionForm {
  return {
    code: promotion.code,
    title: promotion.title,
    description: promotion.description || '',
    discount_type: promotion.discount_type,
    discount_value: String(promotion.discount_value),
    min_subtotal: String(promotion.min_subtotal),
    max_discount: promotion.max_discount ? String(promotion.max_discount) : '',
    starts_at: formatDateTime(promotion.starts_at),
    ends_at: formatDateTime(promotion.ends_at),
    is_active: promotion.is_active,
  };
}

function toPayload(form: PromotionForm): PromotionPayload {
  return {
    code: normalizePromotionCode(form.code),
    title: form.title.trim(),
    description: form.description.trim() || null,
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value),
    min_subtotal: Number(form.min_subtotal || 0),
    max_discount: form.max_discount ? Number(form.max_discount) : null,
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    is_active: form.is_active,
  };
}

function isActiveNow(promotion: Promotion) {
  const now = Date.now();
  const startsAt = promotion.starts_at ? new Date(promotion.starts_at).getTime() : null;
  const endsAt = promotion.ends_at ? new Date(promotion.ends_at).getTime() : null;

  return promotion.is_active && (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
}

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [form, setForm] = useState<PromotionForm>(emptyForm);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const loadPromotions = async () => {
    setIsLoading(true);
    setMessage(null);

    const { promotions: nextPromotions, error } = await fetchPromotions();

    if (error) {
      setMessage('Não foi possível carregar as promoções. Verifique sua permissão de admin.');
    }

    setPromotions(nextPromotions);
    setIsLoading(false);
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const filteredPromotions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return promotions;

    return promotions.filter((promotion) =>
      [promotion.code, promotion.title, promotion.description]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    );
  }, [promotions, search]);

  const stats = useMemo(() => {
    return promotions.reduce(
      (acc, promotion) => {
        acc.total += 1;
        if (isActiveNow(promotion)) acc.active += 1;
        if (!promotion.is_active) acc.paused += 1;
        return acc;
      },
      { total: 0, active: 0, paused: 0 }
    );
  }, [promotions]);

  const openCreateForm = () => {
    setEditingPromotion(null);
    setForm(emptyForm);
    setIsFormOpen(true);
    setMessage(null);
  };

  const openEditForm = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setForm(toForm(promotion));
    setIsFormOpen(true);
    setMessage(null);
  };

  const closeForm = () => {
    setEditingPromotion(null);
    setForm(emptyForm);
    setIsFormOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = toPayload(form);

    if (!payload.code || !payload.title) {
      setMessage('Informe código e nome da campanha.');
      return;
    }

    if (payload.discount_value <= 0 || payload.min_subtotal < 0) {
      setMessage('Informe valores válidos para desconto e pedido mínimo.');
      return;
    }

    if (payload.discount_type === 'percent' && payload.discount_value > 100) {
      setMessage('O desconto percentual não pode passar de 100%.');
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const { promotion, error } = await savePromotion(payload, editingPromotion?.id);

    if (error || !promotion) {
      setMessage('Não foi possível salvar a promoção. Verifique se o código já existe.');
      setIsSaving(false);
      return;
    }

    await loadPromotions();
    closeForm();
    setMessage(editingPromotion ? 'Promoção atualizada.' : 'Promoção criada.');
    setIsSaving(false);
  };

  const handleDelete = async (promotion: Promotion) => {
    if (!confirm(`Excluir o cupom ${promotion.code}?`)) return;

    const wasDeleted = await deletePromotion(promotion.id);
    if (!wasDeleted) {
      setMessage('Não foi possível excluir a promoção.');
      return;
    }

    await loadPromotions();
    setMessage('Promoção excluída.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif text-black">Promoções & Cupons</h1>
          <p className="mt-1 text-sm font-bold text-stone-500">Gerencie cupons aplicados no checkout.</p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-stone-800"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Novo Cupom
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-black p-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Total</p>
          <p className="mt-2 text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-stone-100 bg-white p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Ativos agora</p>
          <p className="mt-2 text-3xl font-bold text-black">{stats.active}</p>
        </div>
        <div className="rounded-lg border border-stone-100 bg-white p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Pausados</p>
          <p className="mt-2 text-3xl font-bold text-black">{stats.paused}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative w-full md:max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-stone-400">
            search
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por cupom ou campanha"
            className="w-full rounded-lg border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm font-bold outline-none focus:border-black"
          />
        </label>
        <button
          type="button"
          onClick={loadPromotions}
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
            <h2 className="text-lg font-bold text-black">{editingPromotion ? 'Editar cupom' : 'Novo cupom'}</h2>
            <button type="button" onClick={closeForm} className="text-stone-500 hover:text-black">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Código</span>
              <input
                value={form.code}
                onChange={(event) => setForm({ ...form, code: normalizePromotionCode(event.target.value) })}
                className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold uppercase outline-none focus:border-black"
              />
            </label>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-bold uppercase text-stone-400">Campanha</span>
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black"
              />
            </label>
            <label className="flex items-end gap-3 rounded-lg border border-stone-200 p-3">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                className="mb-1"
              />
              <span className="text-sm font-bold text-black">Ativo</span>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Tipo</span>
              <select
                value={form.discount_type}
                onChange={(event) => setForm({ ...form, discount_type: event.target.value as PromotionForm['discount_type'] })}
                className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black"
              >
                <option value="percent">Percentual</option>
                <option value="fixed">Valor fixo</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Desconto</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.discount_value}
                onChange={(event) => setForm({ ...form, discount_value: event.target.value })}
                className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Pedido mínimo</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.min_subtotal}
                onChange={(event) => setForm({ ...form, min_subtotal: event.target.value })}
                className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Teto do desconto</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.max_discount}
                onChange={(event) => setForm({ ...form, max_discount: event.target.value })}
                placeholder="Opcional"
                className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Início</span>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(event) => setForm({ ...form, starts_at: event.target.value })}
                className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Fim</span>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(event) => setForm({ ...form, ends_at: event.target.value })}
                className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black"
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-bold uppercase text-stone-400">Descrição</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={3}
                className="w-full resize-none rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black"
              />
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
                <th className="p-4 font-bold">Cupom</th>
                <th className="p-4 font-bold">Desconto</th>
                <th className="p-4 font-bold">Período</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 text-center font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center font-bold text-stone-500">Carregando promoções...</td>
                </tr>
              ) : filteredPromotions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center font-bold text-stone-500">Nenhuma promoção encontrada.</td>
                </tr>
              ) : (
                filteredPromotions.map((promotion) => {
                  const discountLabel =
                    promotion.discount_type === 'percent'
                      ? `${promotion.discount_value}%`
                      : formatMoney(promotion.discount_value);

                  return (
                    <tr key={promotion.id} className="transition-colors hover:bg-stone-50">
                      <td className="p-4">
                        <p className="font-bold text-black">{promotion.code}</p>
                        <p className="text-xs font-bold text-stone-400">{promotion.title}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-black">{discountLabel}</p>
                        <p className="text-xs font-bold text-stone-400">
                          Min. {formatMoney(promotion.min_subtotal)}
                          {promotion.max_discount ? ` | teto ${formatMoney(promotion.max_discount)}` : ''}
                        </p>
                      </td>
                      <td className="p-4 text-xs font-bold text-stone-500">
                        <p>{promotion.starts_at ? new Date(promotion.starts_at).toLocaleString('pt-BR') : 'Início imediato'}</p>
                        <p>{promotion.ends_at ? new Date(promotion.ends_at).toLocaleString('pt-BR') : 'Sem data final'}</p>
                      </td>
                      <td className="p-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isActiveNow(promotion) ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                          {isActiveNow(promotion) ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openEditForm(promotion)} className="p-1 text-blue-500 hover:text-blue-700" title="Editar">
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button onClick={() => handleDelete(promotion)} className="p-1 text-red-500 hover:text-red-700" title="Excluir">
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
