"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@/utils/supabase/admin-client';
import { fetchWinesFromSupabase } from '@/lib/database/wines';
import type { Wine } from '@/types/database';

type Selection = { id: string; title: string; description: string; image_url: string; mobile_image_url: string | null; product_ids: string[]; is_active: boolean };
const blank = { title: '', description: '', image_url: '', mobile_image_url: null as string | null, product_ids: [] as string[], is_active: false };

export function ProductSelectionsManager() {
  const [selections, setSelections] = useState<Selection[]>([]);
  const [products, setProducts] = useState<Wine[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [result, catalog] = await Promise.all([
      createClient().from('product_selections').select('id,title,description,image_url,mobile_image_url,product_ids,is_active').order('created_at', { ascending: false }),
      fetchWinesFromSupabase({ usePublicCache: false }).catch(() => []),
    ]);
    if (result.error) setMessage('Não foi possível carregar as seleções.');
    else setSelections((result.data || []) as Selection[]);
    setProducts(catalog);
  };
  useEffect(() => { void load(); }, []);

  const upload = async (field: 'image_url' | 'mobile_image_url', file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const data = new FormData(); data.append('file', file); data.append('productName', form.title || 'selecao'); data.append('assetType', 'banner');
      const response = await fetch('/api/admin/produtos/imagem', { method: 'POST', body: data, credentials: 'include' });
      const result = await response.json();
      if (!response.ok || !result.publicUrl) throw new Error(result.error || 'Não foi possível enviar a imagem.');
      setForm((current) => ({ ...current, [field]: result.publicUrl }));
      setMessage('Imagem enviada. Salve a seleção para concluir.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível enviar a imagem.'); }
    finally { setBusy(false); }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (form.title.trim().length < 2 || !form.image_url || !form.product_ids.length) { setMessage('Informe o nome, envie uma imagem e selecione pelo menos um produto.'); return; }
    setBusy(true); setMessage('');
    const table = createClient().from('product_selections');
    const payload = { ...form, title: form.title.trim(), description: form.description.trim(), updated_at: new Date().toISOString() };
    const result = editing ? await table.update(payload).eq('id', editing) : await table.insert(payload);
    setBusy(false);
    if (result.error) { setMessage('Não foi possível salvar a seleção.'); return; }
    setOpen(false); setEditing(null); setForm(blank); await load(); setMessage('Seleção salva.');
  };

  return <section className="admin-surface space-y-4 p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Seleções de produtos</h2><p className="text-sm text-stone-500">Crie um banner e escolha produtos com os preços atuais do catálogo.</p></div><button type="button" onClick={() => { setEditing(null); setForm(blank); setOpen(true); setMessage(''); }} className="admin-button bg-black px-4 py-2 text-white">Nova seleção</button></div>
    {message && <p role="status" className="text-sm font-semibold text-stone-600">{message}</p>}
    {open && <form onSubmit={save} className="space-y-3 rounded-xl border border-stone-200 p-4">
      <label className="block text-sm font-bold">Nome<input required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
      <label className="block text-sm font-bold">Descrição<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-lg border p-3" /></label>
      <p className="text-xs text-stone-500">PNG, JPG ou WebP, até 5 MB por imagem. Dimensões recomendadas; o enquadramento pode variar entre telas. Mantenha textos e elementos importantes próximos ao centro.</p>
      <label className="block text-sm font-bold">Banner desktop (obrigatório) — recomendado: 1600 × 800 px<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => void upload('image_url', e.target.files?.[0])} className="mt-1 block w-full text-sm" /></label>
      {form.image_url && <p className="text-xs text-emerald-700">Imagem desktop carregada</p>}
      <label className="block text-sm font-bold">Banner mobile (opcional) — recomendado: 800 × 800 px<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => void upload('mobile_image_url', e.target.files?.[0])} className="mt-1 block w-full text-sm" /></label>
      {form.mobile_image_url ? <div className="flex items-center gap-3"><p className="text-xs text-emerald-700">Imagem mobile carregada</p><button type="button" onClick={() => setForm((current) => ({ ...current, mobile_image_url: null }))} className="text-xs underline">Remover imagem mobile</button></div> : <p className="text-xs text-stone-500">Sem imagem mobile, será usada a imagem desktop.</p>}
      <label className="block text-sm font-bold">Buscar produtos<input value={search} onChange={(e) => setSearch(e.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>
      <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border p-3">{products.filter((product) => product.name.toLowerCase().includes(search.toLowerCase())).map((product) => <label key={product.id} className="flex gap-2 text-sm"><input type="checkbox" checked={form.product_ids.includes(product.id)} onChange={() => setForm((current) => ({ ...current, product_ids: current.product_ids.includes(product.id) ? current.product_ids.filter((id) => id !== product.id) : [...current.product_ids, product.id] }))} />{product.name}</label>)}</div>
      <p className="text-xs text-stone-500">{form.product_ids.length} produto(s) selecionado(s)</p>
      <label className="flex gap-2 text-sm font-bold"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Exibir seleção no catálogo</label>
      <div className="flex gap-2"><button disabled={busy} className="admin-button bg-black px-4 py-2 text-white">{busy ? 'Aguarde...' : 'Salvar seleção'}</button><button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2">Cancelar</button></div>
    </form>}
    <div className="grid gap-3 sm:grid-cols-2">{selections.map((selection) => <div key={selection.id} className="rounded-xl border p-4"><p className="font-bold">{selection.title}</p><p className="text-xs text-stone-500">{selection.product_ids.length} produto(s) · {selection.is_active ? 'Ativa' : 'Pausada'}</p><button type="button" onClick={() => { setEditing(selection.id); setForm({ title: selection.title, description: selection.description, image_url: selection.image_url, mobile_image_url: selection.mobile_image_url, product_ids: selection.product_ids, is_active: selection.is_active }); setOpen(true); setMessage(''); }} className="mt-3 rounded-lg border px-3 py-1 text-sm">Editar</button></div>)}</div>
  </section>;
}
