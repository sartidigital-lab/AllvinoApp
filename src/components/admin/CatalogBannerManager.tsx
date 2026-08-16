"use client";

import { FormEvent, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  deleteCatalogBanner,
  fetchCatalogBanners,
  fetchProductPromotionCampaigns,
  saveCatalogBanner,
} from '@/lib/database/catalogPromotions';
import type { CatalogBanner, CatalogBannerTheme, ProductPromotionCampaign } from '@/types/database';
import { AdminNotice } from '@/components/admin/AdminPrimitives';

type BannerForm = {
  promotion_id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta_label: string;
  image_url: string;
  mobile_image_url: string;
  image_alt: string;
  theme: CatalogBannerTheme;
  show_text: boolean;
  show_cta: boolean;
  show_discount_badge: boolean;
  sort_order: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const emptyForm: BannerForm = {
  promotion_id: '', eyebrow: '', title: '', subtitle: '',
  cta_label: 'Ver seleção', image_url: '', mobile_image_url: '', image_alt: '',
  theme: 'wine', show_text: false, show_cta: false, show_discount_badge: false,
  sort_order: '0', starts_at: '', ends_at: '', is_active: true,
};

const previewThemes: Record<CatalogBannerTheme, string> = {
  wine: 'from-[#2A090D] via-[#701824] to-[#C14B3D]',
  gold: 'from-[#4A2D0B] via-[#A86F20] to-[#E8B95F]',
  forest: 'from-[#102D24] via-[#225E49] to-[#75A987]',
};

function toLocalDate(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}

function toForm(banner: CatalogBanner): BannerForm {
  return {
    promotion_id: banner.promotion_id,
    eyebrow: banner.eyebrow || '',
    title: banner.title,
    subtitle: banner.subtitle || '',
    cta_label: banner.cta_label,
    image_url: banner.image_url || '',
    mobile_image_url: banner.mobile_image_url || '',
    image_alt: banner.image_alt || '',
    theme: banner.theme,
    show_text: banner.show_text,
    show_cta: banner.show_cta,
    show_discount_badge: banner.show_discount_badge,
    sort_order: String(banner.sort_order),
    starts_at: toLocalDate(banner.starts_at),
    ends_at: toLocalDate(banner.ends_at),
    is_active: banner.is_active,
  };
}

export function CatalogBannerManager() {
  const [banners, setBanners] = useState<CatalogBanner[]>([]);
  const [campaigns, setCampaigns] = useState<ProductPromotionCampaign[]>([]);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [editing, setEditing] = useState<CatalogBanner | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<'image_url' | 'mobile_image_url' | null>(null);
  const previewImageUrl = form.image_url || form.mobile_image_url;
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [bannerResult, campaignResult] = await Promise.all([
      fetchCatalogBanners(),
      fetchProductPromotionCampaigns(),
    ]);
    setBanners(bannerResult.banners);
    setCampaigns(campaignResult.campaigns);
    if (bannerResult.error || campaignResult.error) setMessage('Não foi possível carregar banners e campanhas.');
    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
    const refresh = () => void loadData();
    window.addEventListener('catalog-promotions-updated', refresh);
    return () => window.removeEventListener('catalog-promotions-updated', refresh);
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, promotion_id: campaigns[0]?.id || '' });
    setIsFormOpen(true);
    setMessage(null);
  };

  const openEdit = (banner: CatalogBanner) => {
    setEditing(banner);
    setForm(toForm(banner));
    setIsFormOpen(true);
    setMessage(null);
  };

  const handleUpload = async (file: File | undefined, field: 'image_url' | 'mobile_image_url') => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setMessage('Envie uma imagem PNG, JPG, JPEG ou WebP.');
      return;
    }
    setUploadingField(field);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
      const accessToken = (refreshedSession || session)?.access_token;
      if (!accessToken) {
        setMessage('Sessão expirada. Entre novamente para enviar imagens.');
        return;
      }

      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('productName', form.title || 'banner');
      uploadData.append('assetType', 'banner');
      const response = await fetch('/api/admin/produtos/imagem', {
        method: 'POST', credentials: 'include',
        headers: { Authorization: `Bearer ${accessToken}` }, body: uploadData,
      });
      const payload = await response.json().catch(() => ({})) as { publicUrl?: string; error?: string };
      if (!response.ok || !payload.publicUrl) {
        setMessage(payload.error || 'Não foi possível enviar a imagem.');
        return;
      }
      setForm((current) => ({ ...current, [field]: payload.publicUrl! }));
      setMessage('Imagem enviada com sucesso.');
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.promotion_id) {
      setMessage('Informe a campanha e o nome interno do banner.');
      return;
    }
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      setMessage('A data final deve ser posterior ao início.');
      return;
    }
    const sortOrder = Number(form.sort_order);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) {
      setMessage('A ordem deve ser um número inteiro entre 0 e 999.');
      return;
    }

    setIsSaving(true);
    const result = await saveCatalogBanner({
      promotion_id: form.promotion_id,
      eyebrow: form.eyebrow || null,
      title: form.title,
      subtitle: form.subtitle || null,
      cta_label: form.cta_label,
      image_url: form.image_url || null,
      mobile_image_url: form.mobile_image_url || null,
      image_alt: form.image_alt || null,
      theme: form.theme,
      show_text: form.show_text,
      show_cta: form.show_cta,
      show_discount_badge: form.show_discount_badge,
      sort_order: sortOrder,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: form.is_active,
    }, editing?.id);
    if (result.error) {
      setMessage(`Não foi possível salvar o banner: ${result.error.message}`);
      setIsSaving(false);
      return;
    }
    await loadData();
    setIsFormOpen(false);
    setEditing(null);
    setMessage(editing ? 'Banner atualizado.' : 'Banner criado.');
    setIsSaving(false);
  };

  const handleDelete = async (banner: CatalogBanner) => {
    if (!confirm(`Excluir o banner ${banner.title}?`)) return;
    const error = await deleteCatalogBanner(banner.id);
    if (error) setMessage('Não foi possível excluir o banner.');
    else {
      await loadData();
      setMessage('Banner excluído.');
    }
  };

  return (
    <section id="banners" className="admin-surface space-y-5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#B91C1C]">Vitrine pública</p><h2 className="mt-1 text-xl font-bold text-black">Banners do catálogo</h2><p className="mt-1 text-sm font-medium text-stone-500">Organize a rotação e conecte cada destaque a uma campanha.</p></div>
        <button type="button" onClick={openCreate} disabled={campaigns.length === 0} className="admin-button bg-black px-4 text-sm text-white hover:bg-stone-800 disabled:opacity-40">Novo banner</button>
      </div>
      {campaigns.length === 0 && !isLoading && <AdminNotice>Crie uma campanha de produtos antes de adicionar banners.</AdminNotice>}
      {message && <AdminNotice>{message}</AdminNotice>}

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="grid gap-5 rounded-2xl border border-stone-200 bg-[#FDFBF7] p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)] lg:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Campanha</span><select value={form.promotion_id} onChange={(event) => setForm({ ...form, promotion_id: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 text-sm font-bold"><option value="">Selecione</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.title} · -{campaign.discount_percent}%</option>)}</select></label>
            <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Chamada curta (opcional)</span><input value={form.eyebrow} onChange={(event) => setForm({ ...form, eyebrow: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" /></label>
            <label className="space-y-1 sm:col-span-2"><span className="text-xs font-bold uppercase text-stone-500">Nome do banner</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" /><span className="block text-[10px] font-semibold text-stone-400">Identifica o banner no Admin. Só aparece na arte quando “Exibir textos” está ativo.</span></label>
            <label className="space-y-1 sm:col-span-2"><span className="text-xs font-bold uppercase text-stone-500">Subtítulo (opcional)</span><textarea rows={2} value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} className="w-full resize-none rounded-lg border border-stone-200 bg-white p-3 font-bold" /></label>
            <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Texto do botão (opcional)</span><input value={form.cta_label} onChange={(event) => setForm({ ...form, cta_label: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" /></label>
            <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Fundo sem imagem</span><select value={form.theme} onChange={(event) => setForm({ ...form, theme: event.target.value as CatalogBannerTheme })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold"><option value="wine">Vinho</option><option value="gold">Dourado</option><option value="forest">Floresta</option></select></label>
            <fieldset className="rounded-xl border border-stone-200 bg-white p-4 sm:col-span-2">
              <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-stone-500">Elementos sobre a arte (opcionais)</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <label className="flex items-center gap-2 rounded-lg bg-stone-50 p-3 text-sm font-bold"><input type="checkbox" checked={form.show_text} onChange={(event) => setForm({ ...form, show_text: event.target.checked })} />Exibir textos</label>
                <label className="flex items-center gap-2 rounded-lg bg-stone-50 p-3 text-sm font-bold"><input type="checkbox" checked={form.show_cta} onChange={(event) => setForm({ ...form, show_cta: event.target.checked })} />Exibir botão</label>
                <label className="flex items-center gap-2 rounded-lg bg-stone-50 p-3 text-sm font-bold"><input type="checkbox" checked={form.show_discount_badge} onChange={(event) => setForm({ ...form, show_discount_badge: event.target.checked })} />Exibir desconto</label>
              </div>
            </fieldset>
            <aside aria-label="Padrão recomendado para imagens" className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-900">Padrão recomendado da arte</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-amber-200/80 bg-white/80 px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase text-stone-400">Desktop</p>
                  <p className="mt-0.5 font-black text-stone-900">1920 × 600 px</p>
                  <p className="text-xs font-bold text-stone-500">Proporção aproximada 3,2:1</p>
                </div>
                <div className="rounded-lg border border-amber-200/80 bg-white/80 px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase text-stone-400">Mobile</p>
                  <p className="mt-0.5 font-black text-stone-900">1080 × 900 px</p>
                  <p className="text-xs font-bold text-stone-500">Proporção 1,2:1</p>
                </div>
              </div>
              <p className="mt-3 text-xs font-semibold leading-5 text-amber-950/75">
                Use WebP ou JPG, com até 5 MB. A arte é exibida sem filtro ou fundo padrão e pode ser recortada para preencher o banner. Textos, botão e desconto só aparecem quando ativados acima.
              </p>
            </aside>
            <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Imagem desktop</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleUpload(event.target.files?.[0], 'image_url')} className="w-full text-xs font-bold" /><span className="block truncate text-[10px] text-stone-400">{uploadingField === 'image_url' ? 'Enviando...' : form.image_url || 'Opcional'}</span></label>
            <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Imagem mobile</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleUpload(event.target.files?.[0], 'mobile_image_url')} className="w-full text-xs font-bold" /><span className="block truncate text-[10px] text-stone-400">{uploadingField === 'mobile_image_url' ? 'Enviando...' : form.mobile_image_url || 'Usa a imagem desktop'}</span></label>
            <label className="space-y-1 sm:col-span-2"><span className="text-xs font-bold uppercase text-stone-500">Texto alternativo da imagem</span><input value={form.image_alt} onChange={(event) => setForm({ ...form, image_alt: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" /></label>
            <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Início</span><input type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 text-sm font-bold" /></label>
            <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Fim</span><input type="datetime-local" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 text-sm font-bold" /></label>
            <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Ordem</span><input type="number" min="0" max="999" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" /></label>
            <label className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /><span className="text-sm font-bold">Banner ativo</span></label>
          </div>

          <div className="flex flex-col">
            <p className="mb-2 text-xs font-bold uppercase text-stone-500">Prévia</p>
            <div className={`relative min-h-72 flex-1 overflow-hidden rounded-2xl ${previewImageUrl ? 'bg-stone-950' : `bg-gradient-to-br ${previewThemes[form.theme]}`} p-6 text-white`}>
              {previewImageUrl && <img src={previewImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              {(form.show_text || form.show_cta) && <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/15 to-transparent" />}
              {(form.show_text || form.show_cta) && <div className="relative flex h-full min-h-60 flex-col justify-end">{form.show_text && <><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">{form.eyebrow}</p><h3 className="mt-2 font-serif text-3xl font-bold leading-none">{form.title || 'Nome do banner'}</h3>{form.subtitle && <p className="mt-3 text-sm text-white/75">{form.subtitle}</p>}</>}{form.show_cta && <span className="mt-5 w-fit rounded-full bg-white px-4 py-2 text-xs font-black text-black">{form.cta_label || 'Ver seleção'}</span>}</div>}
              {form.show_discount_badge && <span className="absolute right-4 top-4 rounded-full bg-black/30 px-3 py-1.5 text-xs font-black text-white backdrop-blur">Desconto</span>}
            </div>
            <div className="mt-4 flex justify-end gap-3"><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-stone-200 px-4 py-2.5 font-bold">Cancelar</button><button type="submit" disabled={isSaving || Boolean(uploadingField)} className="rounded-lg bg-[#B91C1C] px-5 py-2.5 font-bold text-white disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar banner'}</button></div>
          </div>
        </form>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? <p className="text-sm font-bold text-stone-400">Carregando banners...</p> : banners.map((banner) => (
          <article key={banner.id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className={`relative h-32 ${banner.image_url || banner.mobile_image_url ? 'bg-stone-950' : `bg-gradient-to-br ${previewThemes[banner.theme]}`}`}>{(banner.image_url || banner.mobile_image_url) && <img src={banner.image_url || banner.mobile_image_url || ''} alt="" className="h-full w-full object-cover" />}<span className="absolute left-3 top-3 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">Ordem {banner.sort_order}</span></div>
            <div className="p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-black">{banner.title}</h3><p className="mt-1 text-xs font-bold text-stone-400">{banner.promotion_title} · -{banner.discount_percent}%</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${banner.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{banner.is_active ? 'Ativo' : 'Pausado'}</span></div><div className="mt-4 flex gap-2"><button type="button" onClick={() => openEdit(banner)} className="flex-1 rounded-lg border border-stone-200 py-2 text-xs font-bold">Editar</button><button type="button" onClick={() => handleDelete(banner)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700">Excluir</button></div></div>
          </article>
        ))}
        {!isLoading && banners.length === 0 && <p className="text-sm font-bold text-stone-400">Nenhum banner criado.</p>}
      </div>
    </section>
  );
}
