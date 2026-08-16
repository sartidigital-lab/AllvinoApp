"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { fetchWinesFromSupabase } from '@/lib/database/wines';
import {
  deleteProductPromotionCampaign,
  fetchProductPromotionCampaigns,
  saveProductPromotionCampaign,
} from '@/lib/database/catalogPromotions';
import type { ProductPromotionCampaign, Wine } from '@/types/database';
import { AdminNotice } from '@/components/admin/AdminPrimitives';

type CampaignForm = {
  title: string;
  slug: string;
  description: string;
  discount_percent: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  product_ids: string[];
};

const emptyForm: CampaignForm = {
  title: '', slug: '', description: '', discount_percent: '15',
  starts_at: '', ends_at: '', is_active: true, product_ids: [],
};

function slugify(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function toLocalDate(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}

function campaignIsLive(campaign: ProductPromotionCampaign) {
  const now = Date.now();
  return campaign.is_active
    && (!campaign.starts_at || new Date(campaign.starts_at).getTime() <= now)
    && (!campaign.ends_at || new Date(campaign.ends_at).getTime() >= now);
}

export function ProductCampaignManager() {
  const [campaigns, setCampaigns] = useState<ProductPromotionCampaign[]>([]);
  const [products, setProducts] = useState<Wine[]>([]);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [editing, setEditing] = useState<ProductPromotionCampaign | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [campaignResult, productResult] = await Promise.all([
      fetchProductPromotionCampaigns(),
      fetchWinesFromSupabase({ usePublicCache: false, includeUnpublished: true }).catch(() => []),
    ]);
    setCampaigns(campaignResult.campaigns);
    setProducts(productResult);
    if (campaignResult.error) setMessage('Não foi possível carregar as campanhas.');
    setIsLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => [product.name, product.product_code, product.type]
      .filter(Boolean).some((value) => value!.toLowerCase().includes(term)));
  }, [productSearch, products]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsFormOpen(true);
    setMessage(null);
  };

  const openEdit = (campaign: ProductPromotionCampaign) => {
    setEditing(campaign);
    setForm({
      title: campaign.title,
      slug: campaign.slug,
      description: campaign.description || '',
      discount_percent: String(campaign.discount_percent),
      starts_at: toLocalDate(campaign.starts_at),
      ends_at: toLocalDate(campaign.ends_at),
      is_active: campaign.is_active,
      product_ids: campaign.product_ids,
    });
    setIsFormOpen(true);
    setMessage(null);
  };

  const toggleProduct = (id: string) => {
    setForm((current) => ({
      ...current,
      product_ids: current.product_ids.includes(id)
        ? current.product_ids.filter((productId) => productId !== id)
        : [...current.product_ids, id],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const discount = Number(form.discount_percent);
    if (!form.title.trim() || !slugify(form.slug || form.title)) {
      setMessage('Informe nome e identificador da campanha.');
      return;
    }
    if (!Number.isInteger(discount) || discount < 1 || discount > 90) {
      setMessage('O desconto deve ser um percentual inteiro entre 1% e 90%.');
      return;
    }
    if (form.product_ids.length === 0) {
      setMessage('Selecione pelo menos um produto.');
      return;
    }
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      setMessage('A data final deve ser posterior ao início.');
      return;
    }

    setIsSaving(true);
    const result = await saveProductPromotionCampaign({
      title: form.title,
      slug: slugify(form.slug || form.title),
      description: form.description || null,
      discount_percent: discount,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: form.is_active,
      product_ids: form.product_ids,
    }, editing?.id);

    if (result.error) {
      setMessage(`Não foi possível salvar a campanha: ${result.error.message}`);
      setIsSaving(false);
      return;
    }
    await loadData();
    window.dispatchEvent(new Event('catalog-promotions-updated'));
    setIsFormOpen(false);
    setEditing(null);
    setMessage(editing ? 'Campanha atualizada.' : 'Campanha criada.');
    setIsSaving(false);
  };

  const handleDelete = async (campaign: ProductPromotionCampaign) => {
    if (!confirm(`Excluir a campanha ${campaign.title}? Banners vinculados também serão excluídos.`)) return;
    const error = await deleteProductPromotionCampaign(campaign.id);
    if (error) setMessage('Não foi possível excluir a campanha.');
    else {
      await loadData();
      window.dispatchEvent(new Event('catalog-promotions-updated'));
      setMessage('Campanha excluída.');
    }
  };

  return (
    <section id="campanhas" className="admin-surface space-y-5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#B91C1C]">Preço de catálogo</p>
          <h2 className="mt-1 text-xl font-bold text-black">Campanhas de produtos</h2>
          <p className="mt-1 text-sm font-medium text-stone-500">Defina o percentual, o período e os itens participantes.</p>
        </div>
        <button type="button" onClick={openCreate} className="admin-button bg-black px-4 text-sm text-white hover:bg-stone-800">
          Nova campanha
        </button>
      </div>

      {message && <AdminNotice>{message}</AdminNotice>}

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-200 bg-[#FDFBF7] p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-bold uppercase text-stone-500">Nome</span>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value, slug: editing ? form.slug : slugify(event.target.value) })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-500">Identificador</span>
              <input value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-500">Desconto</span>
              <div className="relative"><input type="number" min="1" max="90" step="1" value={form.discount_percent} onChange={(event) => setForm({ ...form, discount_percent: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 pr-9 font-bold outline-none focus:border-black" /><span className="absolute right-3 top-3 font-black text-stone-400">%</span></div>
            </label>
            <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Início</span><input type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 text-sm font-bold" /></label>
            <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Fim</span><input type="datetime-local" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 text-sm font-bold" /></label>
            <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold uppercase text-stone-500">Descrição</span><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" /></label>
            <label className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /><span className="text-sm font-bold">Campanha ativa</span></label>
          </div>

          <div className="mt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <label className="w-full max-w-md space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Selecionar produtos</span><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar nome, SKU ou tipo" className="w-full rounded-lg border border-stone-200 bg-white p-3 text-sm font-bold" /></label>
              <p className="text-xs font-black text-[#B91C1C]">{form.product_ids.length} selecionado(s)</p>
            </div>
            <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <label key={product.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${form.product_ids.includes(product.id) ? 'border-[#B91C1C] bg-red-50' : 'border-stone-200 bg-white hover:border-stone-400'}`}>
                  <input type="checkbox" checked={form.product_ids.includes(product.id)} onChange={() => toggleProduct(product.id)} />
                  <span className="min-w-0"><span className="block truncate text-sm font-bold text-black">{product.name}</span><span className="block truncate text-[10px] font-bold uppercase text-stone-400">{product.product_code || 'Sem SKU'} · {product.published ? 'Publicado' : 'Oculto'}</span></span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-stone-200 px-4 py-2.5 font-bold text-stone-600">Cancelar</button>
            <button type="submit" disabled={isSaving} className="rounded-lg bg-[#B91C1C] px-5 py-2.5 font-bold text-white disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar campanha'}</button>
          </div>
        </form>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? <p className="text-sm font-bold text-stone-400">Carregando campanhas...</p> : campaigns.map((campaign) => (
          <article key={campaign.id} className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3"><div><span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-[#B91C1C]">-{campaign.discount_percent}%</span><h3 className="mt-2 font-bold text-black">{campaign.title}</h3><p className="text-xs font-bold text-stone-400">/{campaign.slug}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${campaignIsLive(campaign) ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{campaignIsLive(campaign) ? 'No ar' : 'Inativa'}</span></div>
            <p className="mt-3 text-xs font-bold text-stone-500">{campaign.product_ids.length} produto(s) · {campaign.ends_at ? `até ${new Date(campaign.ends_at).toLocaleDateString('pt-BR')}` : 'sem data final'}</p>
            <div className="mt-4 flex gap-2"><button type="button" onClick={() => openEdit(campaign)} className="flex-1 rounded-lg border border-stone-200 py-2 text-xs font-bold hover:bg-stone-50">Editar</button><button type="button" onClick={() => handleDelete(campaign)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Excluir</button></div>
          </article>
        ))}
        {!isLoading && campaigns.length === 0 && <p className="text-sm font-bold text-stone-400">Nenhuma campanha criada.</p>}
      </div>
    </section>
  );
}
