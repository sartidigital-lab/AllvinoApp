"use client";

import { FormEvent, useEffect, useState } from 'react';
import {
  CatalogBanner,
  CatalogBannerPayload,
  deleteCatalogBanner,
  fetchCatalogBanners,
  isCatalogBannerCurrentlyActive,
  saveCatalogBanner,
} from '@/lib/database/banners';
import { createClient } from '@/utils/supabase/client';
import { fetchWinesFromSupabase } from '@/lib/database/wines';
import { Wine } from '@/types/database';

type BannerForm = Omit<CatalogBannerPayload, 'promotion_id'>;

const emptyForm: BannerForm = {
  promotion_slug: null,
  discount_percent: 10,
  product_ids: [],
  eyebrow: '',
  title: '',
  subtitle: '',
  cta_label: 'Ver seleção',
  cta_text_color: '#000000',
  image_url: null,
  mobile_image_url: null,
  image_alt: '',
  sort_order: 0,
  starts_at: '',
  ends_at: '',
  is_active: true,
  show_text: true,
  show_cta: true,
  show_discount_badge: false,
};

function formatDateTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateTime(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDateTime(value: string) {
  return parseDateTime(value)?.toISOString() ?? null;
}

function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

async function uploadBannerImage(file: File, title: string, kind: 'desktop' | 'mobile') {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sessão expirada. Entre novamente para enviar imagens.');

  const body = new FormData();
  body.append('file', file);
  body.append('productName', `banner-${kind}-${title}`);
  const response = await fetch('/api/admin/produtos/imagem', {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.publicUrl) throw new Error(data.error || 'Não foi possível enviar a imagem.');
  return data.publicUrl as string;
}

export default function BannerManager() {
  const [banners, setBanners] = useState<CatalogBanner[]>([]);
  const [products, setProducts] = useState<Wine[]>([]);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [editing, setEditing] = useState<CatalogBanner | null>(null);
  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const loadBanners = async () => {
    setIsLoading(true);
    const result = await fetchCatalogBanners();
    setBanners(result.banners);
    if (result.error) setMessage('Não foi possível carregar os banners.');
    setIsLoading(false);
  };

  useEffect(() => {
    loadBanners();
    fetchWinesFromSupabase({ usePublicCache: false })
      .then(setProducts)
      .catch(() => setMessage('Não foi possível carregar os produtos para a campanha.'));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDesktopFile(null);
    setMobileFile(null);
    setProductSearch('');
    setMessage(null);
    setIsOpen(true);
  };

  const openEdit = (banner: CatalogBanner) => {
    setEditing(banner);
    setForm({
      promotion_slug: banner.promotion?.slug || null,
      discount_percent: banner.promotion?.discount_percent || 10,
      product_ids: banner.promotion?.items?.map((item) => item.product_id) || [],
      eyebrow: banner.eyebrow || '', title: banner.title, subtitle: banner.subtitle || '', cta_label: banner.cta_label,
      cta_text_color: banner.cta_text_color || '#000000',
      image_url: banner.image_url, mobile_image_url: banner.mobile_image_url, image_alt: banner.image_alt || '',
      sort_order: banner.sort_order, starts_at: formatDateTime(banner.starts_at), ends_at: formatDateTime(banner.ends_at),
      is_active: banner.is_active, show_text: banner.show_text, show_cta: banner.show_cta, show_discount_badge: banner.show_discount_badge,
    });
    setDesktopFile(null);
    setMobileFile(null);
    setProductSearch('');
    setMessage(null);
    setIsOpen(true);
  };

  const close = () => { setIsOpen(false); setEditing(null); setDesktopFile(null); setMobileFile(null); };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const startsAt = parseDateTime(form.starts_at);
    const endsAt = parseDateTime(form.ends_at);
    if (form.title.trim().length < 2 || form.title.trim().length > 120) return setMessage('O título deve ter entre 2 e 120 caracteres.');
    if (form.cta_label.trim().length < 2 || form.cta_label.trim().length > 40) return setMessage('O texto do botão deve ter entre 2 e 40 caracteres.');
    if (!isHexColor(form.cta_text_color)) return setMessage('Informe uma cor válida para o texto do botão (ex.: #000000).');
    if (!Number.isInteger(form.discount_percent) || form.discount_percent < 1 || form.discount_percent > 90) return setMessage('O desconto deve estar entre 1% e 90%.');
    if (form.product_ids.length === 0) return setMessage('Selecione pelo menos um produto para a campanha.');
    if (!form.image_url && !desktopFile) return setMessage('Selecione a imagem desktop do banner.');
    if ((form.starts_at && !startsAt) || (form.ends_at && !endsAt)) return setMessage('Informe datas válidas para início e fim.');
    if (startsAt && endsAt && endsAt <= startsAt) return setMessage('A data final deve ser posterior ao início.');

    setIsSaving(true);
    setMessage(null);
    try {
      let imageUrl = form.image_url;
      let mobileImageUrl = form.mobile_image_url;
      if (desktopFile) imageUrl = await uploadBannerImage(desktopFile, form.title, 'desktop');
      if (mobileFile) mobileImageUrl = await uploadBannerImage(mobileFile, form.title, 'mobile');

      const payload: CatalogBannerPayload = {
        ...form,
        promotion_id: editing?.promotion_id || null,
        title: form.title.trim(),
        eyebrow: form.eyebrow?.trim() || null,
        subtitle: form.subtitle?.trim() || null,
        cta_label: form.cta_label.trim(),
        image_url: imageUrl,
        mobile_image_url: mobileImageUrl,
        image_alt: form.image_alt?.trim() || null,
        starts_at: toIsoDateTime(form.starts_at),
        ends_at: toIsoDateTime(form.ends_at),
        sort_order: Number(form.sort_order) || 0,
      };
      const result = await saveCatalogBanner(payload, editing?.id);
      if (result.error || !result.banner) throw result.error || new Error('Não foi possível salvar o banner.');
      await loadBanners();
      close();
      setMessage(editing ? 'Banner atualizado.' : 'Banner criado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o banner.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (banner: CatalogBanner) => {
    if (!confirm(`Excluir o banner "${banner.title}"?`)) return;
    if (!(await deleteCatalogBanner(banner.id))) return setMessage('Não foi possível excluir o banner.');
    await loadBanners();
    setMessage('Banner excluído.');
  };

  return (
    <section className="space-y-4 rounded-lg border border-stone-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold font-serif text-black">Banners do catálogo</h2><p className="text-sm font-bold text-stone-500">Crie artes independentes para desktop e mobile.</p></div>
        <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-800"><span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>Novo Banner</button>
      </div>

      {message && <div className="rounded-lg border border-stone-200 bg-[#FDFBF7] px-4 py-3 text-sm font-bold text-stone-700">{message}</div>}

      {isOpen && <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-stone-200 bg-[#FDFBF7] p-4">
        <div className="flex items-center justify-between"><h3 className="font-bold">{editing ? 'Editar banner' : 'Novo banner'}</h3><button type="button" onClick={close} className="text-stone-500 hover:text-black"><span className="material-symbols-outlined">close</span></button></div>
        <div aria-label="Orientação para as dimensões das imagens" className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950">
          <p className="font-bold">Orientação para as imagens</p>
          <p className="mt-1">Desktop: <strong>1920 × 640 px (3:1)</strong>. Mobile: <strong>1080 × 1200 px (9:10)</strong>. Use JPG, PNG ou WebP, com até 5 MB, e mantenha textos e logotipos dentro da área central segura. A imagem mobile é opcional; sem ela, a arte desktop será utilizada como fallback.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-400">Imagem desktop *</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setDesktopFile(e.target.files?.[0] || null)} className="w-full rounded-lg border border-dashed border-stone-300 bg-white p-3 text-sm" />{form.image_url && !desktopFile && <span className="text-xs text-stone-500">Imagem atual mantida</span>}</label>
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-400">Imagem mobile</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setMobileFile(e.target.files?.[0] || null)} className="w-full rounded-lg border border-dashed border-stone-300 bg-white p-3 text-sm" />{form.mobile_image_url && !mobileFile && <span className="text-xs text-stone-500">Imagem atual mantida</span>}</label>
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-400">Título *</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold" /></label>
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-400">Tag</span><input value={form.eyebrow || ''} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} className="w-full rounded-lg border border-stone-200 p-3 text-sm" /></label>
          <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold uppercase text-stone-400">Subtítulo</span><textarea value={form.subtitle || ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} rows={2} className="w-full rounded-lg border border-stone-200 p-3 text-sm" /></label>
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-400">Texto do botão</span><input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} maxLength={40} className="w-full rounded-lg border border-stone-200 p-3 text-sm" /></label>
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-400">Cor do texto do botão</span><div className="flex items-center gap-2"><input type="color" aria-label="Cor do texto do botão" value={isHexColor(form.cta_text_color) ? form.cta_text_color : '#000000'} onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })} className="h-12 w-14 cursor-pointer rounded-lg border border-stone-200 bg-white p-1" /><input value={form.cta_text_color} onChange={(e) => setForm({ ...form, cta_text_color: e.target.value })} maxLength={7} placeholder="#000000" className="min-w-0 flex-1 rounded-lg border border-stone-200 p-3 text-sm font-mono uppercase" /></div><span className="text-xs text-stone-500">A cor será aplicada somente às letras do botão sobre a imagem.</span></label>
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-400">Desconto da campanha *</span><div className="relative"><input type="number" min="1" max="90" step="1" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })} className="w-full rounded-lg border border-stone-200 p-3 pr-9 text-sm font-bold" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">%</span></div></label>
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-400">Início</span><input type="datetime-local" value={form.starts_at || ''} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="w-full rounded-lg border border-stone-200 p-3 text-sm" /></label>
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-400">Fim</span><input type="datetime-local" value={form.ends_at || ''} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="w-full rounded-lg border border-stone-200 p-3 text-sm" /></label>
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-400">Ordem</span><input type="number" min="0" max="999" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-full rounded-lg border border-stone-200 p-3 text-sm" /></label>
          <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-400">Texto alternativo</span><input value={form.image_alt || ''} onChange={(e) => setForm({ ...form, image_alt: e.target.value })} className="w-full rounded-lg border border-stone-200 p-3 text-sm" /></label>
          <div className="space-y-2 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold uppercase text-stone-400">Produtos em promoção *</span><span className="text-xs font-bold text-[#B91C1C]">{form.product_ids.length} selecionado(s)</span></div>
            <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Buscar produto por nome ou código" className="w-full rounded-lg border border-stone-200 p-3 text-sm" />
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-stone-200 bg-white p-2">
              {products.filter((product) => {
                const term = productSearch.trim().toLowerCase();
                return !term || product.name.toLowerCase().includes(term) || product.product_code?.toLowerCase().includes(term);
              }).map((product) => {
                const selected = form.product_ids.includes(product.id);
                return <label key={product.id} className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${selected ? 'bg-red-50' : 'hover:bg-stone-50'}`}><input type="checkbox" checked={selected} onChange={() => setForm((current) => ({ ...current, product_ids: selected ? current.product_ids.filter((id) => id !== product.id) : [...current.product_ids, product.id] }))} /><span className="flex-1 font-bold">{product.name}</span><span className="text-xs text-stone-400">{product.product_code || 'Sem código'}</span></label>;
              })}
              {products.length === 0 && <p className="p-3 text-center text-sm font-bold text-stone-400">Nenhum produto publicado disponível.</p>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-bold"><label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Ativo</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.show_text} onChange={(e) => setForm({ ...form, show_text: e.target.checked })} />Exibir textos</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.show_cta} onChange={(e) => setForm({ ...form, show_cta: e.target.checked })} />Exibir botão</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.show_discount_badge} onChange={(e) => setForm({ ...form, show_discount_badge: e.target.checked })} />Exibir desconto</label></div>
        <div className="flex justify-end gap-3"><button type="button" onClick={close} className="rounded-lg border border-stone-200 px-4 py-2.5 font-bold text-stone-600">Cancelar</button><button type="submit" disabled={isSaving} className="rounded-lg bg-[#B91C1C] px-5 py-2.5 font-bold text-white disabled:opacity-60">{isSaving ? 'Salvando...' : 'Salvar banner'}</button></div>
      </form>}

      <div className="overflow-x-auto"><table className="w-full border-collapse text-left"><thead><tr className="border-b border-stone-100 bg-[#FDFBF7] text-xs uppercase tracking-wider text-stone-500"><th className="p-3">Banner</th><th className="p-3">Imagens</th><th className="p-3">Período</th><th className="p-3">Status</th><th className="p-3 text-center">Ações</th></tr></thead><tbody className="divide-y divide-stone-100">{isLoading ? <tr><td colSpan={5} className="p-6 text-center font-bold text-stone-500">Carregando banners...</td></tr> : banners.length === 0 ? <tr><td colSpan={5} className="p-6 text-center font-bold text-stone-500">Nenhum banner cadastrado.</td></tr> : banners.map((banner) => { const activeNow = isCatalogBannerCurrentlyActive(banner); return <tr key={banner.id} className="hover:bg-stone-50"><td className="p-3"><p className="font-bold">{banner.title}</p><p className="text-xs text-stone-400">{banner.cta_label}</p></td><td className="p-3 text-xs font-bold text-stone-500">Desktop {banner.image_url ? '✓' : '—'} · Mobile {banner.mobile_image_url ? '✓' : '—'}</td><td className="p-3 text-xs text-stone-500">{banner.starts_at ? new Date(banner.starts_at).toLocaleString('pt-BR') : 'Imediato'}<br />{banner.ends_at ? new Date(banner.ends_at).toLocaleString('pt-BR') : 'Sem fim'}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${activeNow ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{activeNow ? 'Ativo' : banner.is_active ? 'Fora do período' : 'Pausado'}</span></td><td className="p-3"><div className="flex justify-center gap-2"><button type="button" onClick={() => openEdit(banner)} className="p-1 text-blue-500" title="Editar"><span className="material-symbols-outlined">edit</span></button><button type="button" onClick={() => handleDelete(banner)} className="p-1 text-red-500" title="Excluir"><span className="material-symbols-outlined">delete</span></button></div></td></tr>})}</tbody></table></div>
    </section>
  );
}
