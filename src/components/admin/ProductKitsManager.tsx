"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { fetchWinesFromSupabase } from '@/lib/database/wines';
import { normalizeProductCode, saveManualStockLevel } from '@/lib/database/stock';
import { ProductImage } from '@/components/ui';
import { AdminNotice } from '@/components/admin/AdminPrimitives';
import type { Wine } from '@/types/database';

type KitItem = { product_id: string; quantity: number };
type KitForm = { name: string; description: string; price: string; product_code: string; stock: string; image_url: string; published: boolean; items: KitItem[] };
type KitRow = { id: string; nome: string; descricao: string | null; preco: number; sku_sankhya: string | null; estoque: number; imagem_url: string | null; publicado: boolean; product_kit_items: KitItem[] | null };

const emptyForm: KitForm = { name: '', description: '', price: '', product_code: '', stock: '0', image_url: '', published: true, items: [] };
const allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp'];

export function ProductKitsManager() {
  const [kits, setKits] = useState<KitRow[]>([]);
  const [products, setProducts] = useState<Wine[]>([]);
  const [form, setForm] = useState<KitForm>(emptyForm);
  const [editing, setEditing] = useState<KitRow | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const [kitsResult, catalog] = await Promise.all([
      supabase.from('produtos').select('id,nome,descricao,preco,sku_sankhya,estoque,imagem_url,publicado,product_kit_items(product_id,quantity)').eq('tipo_produto', 'kit').order('criado_em', { ascending: false }),
      fetchWinesFromSupabase({ usePublicCache: false, includeUnpublished: true }).catch(() => []),
    ]);
    if (kitsResult.error) setMessage('Não foi possível carregar os kits.');
    setKits((kitsResult.data || []) as KitRow[]);
    setProducts(catalog.filter((product) => product.product_kind !== 'kit'));
    setIsLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => [product.name, product.product_code, product.type].filter(Boolean).some((value) => value!.toLowerCase().includes(term)));
  }, [products, search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setSearch(''); setMessage(null); setIsFormOpen(true); };
  const openEdit = (kit: KitRow) => {
    setEditing(kit);
    setForm({ name: kit.nome, description: kit.descricao || '', price: String(kit.preco), product_code: kit.sku_sankhya || '', stock: String(kit.estoque), image_url: kit.imagem_url || '', published: kit.publicado, items: kit.product_kit_items || [] });
    setSearch(''); setMessage(null); setIsFormOpen(true);
  };
  const setQuantity = (productId: string, quantity: number) => setForm((current) => ({ ...current, items: current.items.map((item) => item.product_id === productId ? { ...item, quantity: Math.max(1, Math.trunc(quantity || 1)) } : item) }));
  const toggleItem = (productId: string) => setForm((current) => ({ ...current, items: current.items.some((item) => item.product_id === productId) ? current.items.filter((item) => item.product_id !== productId) : [...current.items, { product_id: productId, quantity: 1 }] }));

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!allowedImageTypes.includes(file.type)) { setMessage('Envie uma imagem PNG, JPG, JPEG ou WebP.'); return; }
    setIsUploading(true); setMessage(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { session: refreshed } } = await supabase.auth.refreshSession();
      const token = (refreshed || session)?.access_token;
      if (!token) { setMessage('Sessão expirada. Entre novamente para enviar imagens.'); return; }
      const body = new FormData(); body.append('file', file); body.append('productName', form.name || 'kit');
      const response = await fetch('/api/admin/produtos/imagem', { method: 'POST', credentials: 'include', headers: { Authorization: `Bearer ${token}` }, body });
      const payload = await response.json().catch(() => ({})) as { publicUrl?: string; error?: string };
      if (!response.ok || !payload.publicUrl) { setMessage(payload.error || 'Não foi possível enviar a imagem.'); return; }
      setForm((current) => ({ ...current, image_url: payload.publicUrl! }));
      setMessage('Imagem do kit enviada. Salve para concluir.');
    } finally { setIsUploading(false); }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const price = Number(form.price); const stock = Math.trunc(Number(form.stock)); const productCode = normalizeProductCode(form.product_code);
    if (form.name.trim().length < 2 || !Number.isFinite(price) || price < 0 || !productCode || !Number.isFinite(stock) || stock < 0 || form.items.length === 0) {
      setMessage('Informe nome, preço, SKU manual, saldo e ao menos um item do kit.'); return;
    }
    setIsSaving(true); setMessage(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('save_product_kit', {
        p_id: editing?.id || null, p_name: form.name.trim(), p_description: form.description.trim() || null,
        p_price: price, p_product_code: productCode, p_image_url: form.image_url.trim() || null,
        p_stock: stock, p_published: form.published, p_items: form.items,
      });
      if (error || !data) { setMessage(`Não foi possível salvar o kit: ${error?.message || 'o banco não confirmou a gravação.'}`); return; }
      const stockResult = await saveManualStockLevel({ product_code: productCode, quantity: stock });
      if (stockResult.error) { setMessage(`Kit salvo, mas o saldo manual não foi sincronizado: ${stockResult.error.message}`); return; }
      await loadData(); setIsFormOpen(false); setEditing(null); setMessage(editing ? 'Kit atualizado.' : 'Kit criado e saldo manual registrado.');
    } finally { setIsSaving(false); }
  };

  return <section id="kits" className="admin-surface space-y-5 p-5 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#B91C1C]">Vitrine pública</p><h2 className="mt-1 text-xl font-bold text-black">Kits</h2><p className="mt-1 text-sm font-medium text-stone-500">Monte seleções com quantos produtos desejar, foto, preço, SKU e saldo próprios.</p></div><button type="button" onClick={openCreate} className="admin-button bg-black px-4 text-sm text-white hover:bg-stone-800">Novo kit</button></div>
    {message && <AdminNotice>{message}</AdminNotice>}
    {isFormOpen && <form onSubmit={handleSave} className="rounded-2xl border border-stone-200 bg-[#FDFBF7] p-4 sm:p-5"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 lg:col-span-2"><span className="text-xs font-bold uppercase text-stone-500">Nome do kit</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" /></label>
      <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Preço do kit</span><input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" /></label>
      <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">SKU manual</span><input required value={form.product_code} onChange={(event) => setForm({ ...form, product_code: normalizeProductCode(event.target.value) })} placeholder="Ex.: KIT-INVERNO-01" className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold uppercase" /><span className="block text-[10px] font-semibold text-stone-400">Obrigatório para o saldo próprio do kit.</span></label>
      <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Saldo manual</span><input required type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" /></label>
      <label className="space-y-2 lg:col-span-2"><span className="text-xs font-bold uppercase text-stone-500">Imagem do kit</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={isUploading} onChange={(event) => { void handleUpload(event.target.files?.[0]); event.currentTarget.value = ''; }} className="block w-full text-xs font-bold" />{form.image_url && <ProductImage src={form.image_url} alt="Prévia do kit" width={96} height={96} sizes="96px" className="h-20 w-20 rounded-lg border border-stone-200 object-contain" />}</label>
      <label className="space-y-1 lg:col-span-2"><span className="text-xs font-bold uppercase text-stone-500">Descrição</span><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full resize-none rounded-lg border border-stone-200 bg-white p-3 font-bold" /></label>
      <label className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} /><span className="text-sm font-bold">Publicado no catálogo</span></label>
    </div>
    <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><label className="w-full max-w-md space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Itens do kit</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto por nome ou SKU" className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold" /></label><p className="text-xs font-black text-[#B91C1C]">{form.items.length} produto(s) no kit</p></div><div className="mt-3 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{filteredProducts.map((product) => { const item = form.items.find((entry) => entry.product_id === product.id); return <div key={product.id} className={`flex items-center gap-2 rounded-xl border p-2 ${item ? 'border-[#741128] bg-red-50' : 'border-stone-200'}`}><input aria-label={`Adicionar ${product.name} ao kit`} type="checkbox" checked={Boolean(item)} onChange={() => toggleItem(product.id)} /><ProductImage src={product.image_url} alt="" width={36} height={44} sizes="36px" className="h-11 w-9 object-contain" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{product.name}</span><span className="block text-[10px] text-stone-400">{product.product_code || 'Sem SKU'}</span></span>{item && <input aria-label={`Quantidade de ${product.name}`} type="number" min="1" value={item.quantity} onChange={(event) => setQuantity(product.id, Number(event.target.value))} className="w-14 rounded border border-stone-200 bg-white p-1 text-center text-xs font-bold" />}</div>; })}</div></div>
    <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-stone-200 px-4 py-2.5 font-bold">Cancelar</button><button type="submit" disabled={isSaving || isUploading} className="rounded-lg bg-[#B91C1C] px-5 py-2.5 font-bold text-white disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar kit'}</button></div></form>}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{isLoading ? <p className="text-sm font-bold text-stone-400">Carregando kits...</p> : kits.map((kit) => <article key={kit.id} className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-4"><ProductImage src={kit.imagem_url} alt={kit.nome} width={64} height={80} sizes="64px" className="h-20 w-16 rounded bg-stone-50 object-contain" /><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold text-black">{kit.nome}</p><p className="mt-1 text-xs font-bold text-[#741128]">R$ {Number(kit.preco).toFixed(2).replace('.', ',')}</p><p className="mt-1 text-[10px] font-bold text-stone-400">{kit.product_kit_items?.length || 0} item(ns) · SKU {kit.sku_sankhya || '—'} · {kit.estoque} un.</p><button type="button" onClick={() => openEdit(kit)} className="mt-3 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold hover:bg-stone-50">Editar</button></div></article>)}{!isLoading && kits.length === 0 && <p className="text-sm font-bold text-stone-400">Nenhum kit cadastrado.</p>}</div>
  </section>;
}
