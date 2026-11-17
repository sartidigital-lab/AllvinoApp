"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/admin-client';
import { fetchWinesFromSupabase } from '@/lib/database/wines';
import { fetchStockLevelByCode, normalizeProductCode, saveManualStockLevel } from '@/lib/database/stock';
import { addKitItem, MAX_KIT_ITEM_QUANTITY, removeKitItem, updateKitItemQuantity, type KitItem } from '@/lib/kits/composition';
import { type KitRecord } from '@/lib/kits/records';
import { ProductImage } from '@/components/ui';
import { AdminNotice } from '@/components/admin/AdminPrimitives';
import type { Wine } from '@/types/database';

type KitForm = { name: string; description: string; original_price: string; price: string; product_code: string; stock: string; image_url: string; published: boolean; items: KitItem[] };
type KitRow = KitRecord;

const emptyForm: KitForm = { name: '', description: '', original_price: '', price: '', product_code: '', stock: '0', image_url: '', published: true, items: [] };
const allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp'];

function getKitItemQuantity(items: KitItem[] | null | undefined) {
  return (items || []).reduce((total, item) => total + Math.max(0, Math.trunc(Number(item.quantity) || 0)), 0);
}

export function ProductKitsManager({ initialKitId }: { initialKitId?: string }) {
  const [kits, setKits] = useState<KitRow[]>([]);
  const [products, setProducts] = useState<Wine[]>([]);
  const [form, setForm] = useState<KitForm>(emptyForm);
  const [editing, setEditing] = useState<KitRow | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [compositionCode, setCompositionCode] = useState('');
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [usesImportedStock, setUsesImportedStock] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const handledInitialKitId = useRef<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [kitsResult, catalogResult] = await Promise.all([
      fetch('/api/admin/kits', { credentials: 'include', cache: 'no-store' })
        .then(async (response) => {
          const payload = await response.json().catch(() => ({})) as { kits?: KitRow[]; error?: string };
          if (!response.ok || !Array.isArray(payload.kits)) throw new Error(payload.error || 'Não foi possível carregar os Kits.');
          return { kits: payload.kits, error: null as unknown };
        })
        .catch((error: unknown) => ({ kits: [], error })),
      fetchWinesFromSupabase({ usePublicCache: false, includeUnpublished: true })
        .then((catalog) => ({ catalog, error: null as unknown }))
        .catch((error: unknown) => ({ catalog: [], error })),
    ]);
    if (kitsResult.error) {
      console.error('Não foi possível carregar os Kits:', kitsResult.error);
      setMessage('Não foi possível carregar os kits. Tente novamente.');
      setHasLoadError(true);
    } else {
      setHasLoadError(false);
      setKits(kitsResult.kits);
    }
    if (catalogResult.error) {
      console.error('Não foi possível carregar o catálogo de produtos avulsos:', catalogResult.error);
      setProducts([]);
      if (!kitsResult.error) setMessage('Os Kits foram carregados, mas não foi possível carregar o catálogo de produtos avulsos.');
    } else {
      setProducts(catalogResult.catalog.filter((product) => product.product_kind !== 'kit'));
    }
    setIsLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => [product.name, product.product_code, product.type].filter(Boolean).some((value) => value!.toLowerCase().includes(term)));
  }, [products, search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setSearch(''); setCompositionCode(''); setUsesImportedStock(false); setMessage(null); setIsFormOpen(true); };
  const openEdit = (kit: KitRow) => {
    setEditing(kit);
    setForm({ name: kit.nome, description: kit.descricao || '', original_price: kit.preco_original == null ? '' : String(kit.preco_original), price: String(kit.preco), product_code: kit.sku_sankhya || '', stock: String(kit.estoque), image_url: kit.imagem_url || '', published: kit.publicado, items: kit.product_kit_items || [] });
    setSearch(''); setCompositionCode(''); setUsesImportedStock(false); setMessage(null); setIsFormOpen(true);
  };

  useEffect(() => {
    if (!initialKitId || isLoading || hasLoadError || handledInitialKitId.current === initialKitId) return;

    handledInitialKitId.current = initialKitId;
    const kit = kits.find((entry) => entry.id === initialKitId);
    if (kit) {
      openEdit(kit);
    } else {
      setMessage('Não foi possível localizar o Kit solicitado para edição.');
    }
  }, [initialKitId, isLoading, hasLoadError, kits]);

  const setQuantity = (productId: string, quantity: number) => setForm((current) => ({ ...current, items: updateKitItemQuantity(current.items, productId, quantity) }));
  const removeItem = (productId: string) => setForm((current) => ({ ...current, items: removeKitItem(current.items, productId) }));
  const toggleItem = (productId: string) => setForm((current) => ({ ...current, items: current.items.some((item) => item.product_id === productId) ? removeKitItem(current.items, productId) : [...current.items, { product_id: productId, quantity: 1 }] }));

  const addProductByCode = () => {
    const code = normalizeProductCode(compositionCode);
    const product = products.find((item) => normalizeProductCode(item.product_code || '') === code);
    if (!code || !product) { setMessage('Informe um código de um produto avulso já cadastrado.'); return; }
    const currentItem = form.items.find((item) => item.product_id === product.id);
    if (currentItem?.quantity >= MAX_KIT_ITEM_QUANTITY) { setMessage(`Este produto já atingiu o limite de ${MAX_KIT_ITEM_QUANTITY} un. no kit.`); return; }
    setForm((current) => ({ ...current, items: addKitItem(current.items, product.id) }));
    setCompositionCode('');
    setMessage(currentItem ? `${product.name}: quantidade aumentada para ${currentItem.quantity + 1} un.` : `${product.name} incluído no kit.`);
  };

  const syncStockFromCode = async () => {
    const productCode = normalizeProductCode(form.product_code);
    if (!productCode) { setMessage('Informe o código de estoque do kit.'); return; }
    setIsCheckingStock(true);
    const { quantity, error } = await fetchStockLevelByCode(productCode);
    setIsCheckingStock(false);
    if (error) { setMessage('Não foi possível consultar o arquivo de estoque.'); return; }
    if (quantity === null) { setUsesImportedStock(false); setMessage(`Código ${productCode} ainda não está na importação. Informe o saldo manualmente.`); return; }
    setForm((current) => ({ ...current, product_code: productCode, stock: String(quantity) }));
    setUsesImportedStock(true);
    setMessage(`Saldo de ${quantity} un. encontrado na importação. Novas importações manterão o kit sincronizado.`);
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!allowedImageTypes.includes(file.type)) { setMessage('Envie uma imagem PNG, JPG, JPEG ou WebP.'); return; }
    setIsUploading(true); setMessage(null);
    try {
      const body = new FormData(); body.append('file', file); body.append('productName', form.name || 'kit');
      const response = await fetch('/api/admin/produtos/imagem', { method: 'POST', credentials: 'include', body });
      const payload = await response.json().catch(() => ({})) as { publicUrl?: string; error?: string };
      if (!response.ok || !payload.publicUrl) { setMessage(payload.error || 'Não foi possível enviar a imagem.'); return; }
      setForm((current) => ({ ...current, image_url: payload.publicUrl! }));
      setMessage('Imagem do kit enviada. Salve para concluir.');
    } finally { setIsUploading(false); }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const price = Number(form.price); const originalPrice = form.original_price.trim() ? Number(form.original_price) : null; const stock = Math.trunc(Number(form.stock)); const productCode = normalizeProductCode(form.product_code);
    if (form.name.trim().length < 2 || !Number.isFinite(price) || price < 0 || (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < price)) || !productCode || !Number.isFinite(stock) || stock < 0 || form.items.length === 0) {
      setMessage('Informe nome, preço “Por”, SKU, saldo e ao menos um item. O preço “De” é opcional e não pode ser menor que o preço “Por”.'); return;
    }
    setIsSaving(true); setMessage(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('save_product_kit', {
        p_id: editing?.id || null, p_name: form.name.trim(), p_description: form.description.trim() || null,
        p_price: price, p_original_price: originalPrice, p_product_code: productCode, p_image_url: form.image_url.trim() || null,
        p_stock: stock, p_published: form.published, p_items: form.items,
      });
      if (error || !data) { setMessage(`Não foi possível salvar o kit: ${error?.message || 'o banco não confirmou a gravação.'}`); return; }
      if (!usesImportedStock) {
        const stockResult = await saveManualStockLevel({ product_code: productCode, quantity: stock });
        if (stockResult.error) { setMessage(`Kit salvo, mas o saldo manual não foi sincronizado: ${stockResult.error.message}`); return; }
      }
      await loadData(); setIsFormOpen(false); setEditing(null); setMessage(editing ? 'Kit atualizado.' : usesImportedStock ? 'Kit criado e vinculado ao saldo importado.' : 'Kit criado e saldo manual registrado.');
    } finally { setIsSaving(false); }
  };

  const originalPrice = Number(form.original_price);
  const currentPrice = Number(form.price);
  const calculatedDiscount = Number.isFinite(originalPrice) && originalPrice > currentPrice && currentPrice >= 0
    ? Math.round((1 - currentPrice / originalPrice) * 100)
    : 0;

  return <section id="kits" className="admin-surface space-y-5 p-5 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#B91C1C]">Vitrine pública</p><h2 className="mt-1 text-xl font-bold text-black">Kits</h2><p className="mt-1 text-sm font-medium text-stone-500">Monte seleções com quantos produtos desejar, foto, preço, SKU e saldo próprios.</p></div><button type="button" onClick={openCreate} className="admin-button bg-black px-4 text-sm text-white hover:bg-stone-800">Novo kit</button></div>
    {message && <AdminNotice>{message}</AdminNotice>}
    {isFormOpen && <form onSubmit={handleSave} className="rounded-2xl border border-stone-200 bg-[#FDFBF7] p-4 sm:p-5"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 lg:col-span-2"><span className="text-xs font-bold uppercase text-stone-500">Nome do kit</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" /></label>
      <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Preço “De”</span><input type="number" min="0" step="0.01" value={form.original_price} onChange={(event) => setForm({ ...form, original_price: event.target.value })} placeholder="Opcional" className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" /></label>
      <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Preço “Por”</span><input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" /></label>
      <div className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Desconto</span><output className="flex min-h-12 items-center rounded-lg border border-stone-200 bg-stone-50 px-3 font-black text-[#B91C1C]">{calculatedDiscount > 0 ? `${calculatedDiscount}% OFF` : 'Preencha “De” e “Por”'}</output></div>
      <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Código de estoque</span><div className="flex gap-2"><input required value={form.product_code} onChange={(event) => { setUsesImportedStock(false); setForm({ ...form, product_code: normalizeProductCode(event.target.value) }); }} onBlur={() => { void syncStockFromCode(); }} placeholder="Ex.: KIT-INVERNO-01" className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white p-3 font-bold uppercase" /><button type="button" onClick={() => { void syncStockFromCode(); }} disabled={isCheckingStock} className="rounded-lg border border-stone-200 px-3 text-xs font-bold hover:bg-stone-50 disabled:opacity-50">{isCheckingStock ? '...' : 'Consultar'}</button></div><span className="block text-[10px] font-semibold text-stone-400">Use um código da importação ou crie um código livre para saldo manual.</span></label>
      <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Saldo do kit</span><input required type="number" min="0" value={form.stock} onChange={(event) => { setUsesImportedStock(false); setForm({ ...form, stock: event.target.value }); }} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" /><span className={`block text-[10px] font-semibold ${usesImportedStock ? 'text-emerald-700' : 'text-stone-400'}`}>{usesImportedStock ? 'Vinculado ao saldo da última importação.' : 'Será salvo como saldo manual do kit.'}</span></label>
      <label className="space-y-2 lg:col-span-2"><span className="text-xs font-bold uppercase text-stone-500">Imagem do kit</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={isUploading} onChange={(event) => { void handleUpload(event.target.files?.[0]); event.currentTarget.value = ''; }} className="block w-full text-xs font-bold" />{form.image_url && <ProductImage src={form.image_url} alt="Prévia do kit" width={96} height={96} sizes="96px" className="h-20 w-20 rounded-lg border border-stone-200 object-contain" />}</label>
      <label className="space-y-1 lg:col-span-2"><span className="text-xs font-bold uppercase text-stone-500">Descrição</span><textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full resize-none rounded-lg border border-stone-200 bg-white p-3 font-bold" /></label>
      <label className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} /><span className="text-sm font-bold">Publicado no catálogo</span></label>
    </div>
    <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><label className="w-full max-w-md space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Itens do kit</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar produto por nome ou SKU" className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold" /></label><div className="flex w-full gap-2 sm:w-auto"><input value={compositionCode} onChange={(event) => setCompositionCode(normalizeProductCode(event.target.value))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addProductByCode(); } }} placeholder="Adicionar por código" className="min-w-0 flex-1 rounded-lg border border-stone-200 p-3 text-sm font-bold uppercase sm:w-48" /><button type="button" onClick={addProductByCode} className="rounded-lg border border-stone-200 px-3 text-xs font-bold hover:bg-stone-50">Incluir</button></div><p className="text-xs font-black text-[#B91C1C]">{getKitItemQuantity(form.items)} item(ns) no kit</p></div><p className="mt-2 text-xs font-medium text-stone-500">Para incluir outra unidade, informe novamente o mesmo código. Você também pode ajustar a quantidade ao lado do produto.</p>{form.items.length > 0 && <div className="mt-3 rounded-xl border border-red-100 bg-red-50/50 p-3"><div><p className="text-xs font-black uppercase tracking-wide text-[#741128]">Composição atual do kit</p><p className="mt-1 text-xs text-stone-500">Edite quantidades ou remova produtos desta composição antes de salvar.</p></div><div className="mt-3 space-y-2">{form.items.map((item) => { const product = products.find((entry) => entry.id === item.product_id); const productName = product?.name || 'Produto da composição'; return <div key={item.product_id} className="flex flex-wrap items-center gap-2 rounded-lg border border-red-100 bg-white p-2"><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-black">{productName}</span><span className="block text-[10px] text-stone-400">{product?.product_code || item.product_id}</span></span><button type="button" aria-label={`Diminuir quantidade de ${productName}`} onClick={() => setQuantity(item.product_id, item.quantity - 1)} disabled={item.quantity <= 1} className="h-7 w-7 rounded border border-stone-200 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">−</button><input aria-label={`Quantidade na composição de ${productName}`} type="number" min="1" max={MAX_KIT_ITEM_QUANTITY} value={item.quantity} onChange={(event) => setQuantity(item.product_id, Number(event.target.value))} className="h-7 w-14 rounded border border-stone-200 bg-white px-1 text-center text-xs font-bold" /><button type="button" aria-label={`Aumentar quantidade de ${productName}`} onClick={() => setQuantity(item.product_id, item.quantity + 1)} disabled={item.quantity >= MAX_KIT_ITEM_QUANTITY} className="h-7 w-7 rounded border border-stone-200 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">+</button><button type="button" onClick={() => removeItem(item.product_id)} className="rounded border border-red-200 px-2 py-1 text-xs font-bold text-[#B91C1C] hover:bg-red-50">Remover</button></div>; })}</div></div>}<div className="mt-3 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{filteredProducts.map((product) => { const item = form.items.find((entry) => entry.product_id === product.id); return <div key={product.id} className={`flex items-center gap-2 rounded-xl border p-2 ${item ? 'border-[#741128] bg-red-50' : 'border-stone-200'}`}><input aria-label={`Adicionar ${product.name} ao kit`} type="checkbox" checked={Boolean(item)} onChange={() => toggleItem(product.id)} /><ProductImage src={product.image_url} alt="" width={36} height={44} sizes="36px" className="h-11 w-9 object-contain" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{product.name}</span><span className="block text-[10px] text-stone-400">{product.product_code || 'Sem SKU'} · saldo {product.stock} un.</span></span>{item && <input aria-label={`Quantidade de ${product.name}`} type="number" min="1" max={MAX_KIT_ITEM_QUANTITY} value={item.quantity} onChange={(event) => setQuantity(product.id, Number(event.target.value))} className="w-14 rounded border border-stone-200 bg-white p-1 text-center text-xs font-bold" />}</div>; })}</div></div>
    <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-stone-200 px-4 py-2.5 font-bold">Cancelar</button><button type="submit" disabled={isSaving || isUploading} className="rounded-lg bg-[#B91C1C] px-5 py-2.5 font-bold text-white disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar kit'}</button></div></form>}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{isLoading ? <p className="text-sm font-bold text-stone-400">Carregando kits...</p> : kits.map((kit) => { const discount = kit.preco_original && kit.preco_original > kit.preco ? Math.round((1 - kit.preco / kit.preco_original) * 100) : 0; return <article key={kit.id} className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-4"><ProductImage src={kit.imagem_url} alt={kit.nome} width={64} height={80} sizes="64px" className="h-20 w-16 rounded bg-stone-50 object-contain" /><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold text-black">{kit.nome}</p>{kit.preco_original && kit.preco_original > kit.preco && <p className="mt-1 text-[10px] font-bold text-stone-400">De <span className="line-through">R$ {Number(kit.preco_original).toFixed(2).replace('.', ',')}</span> · -{discount}%</p>}<p className="mt-1 text-xs font-bold text-[#741128]">Por R$ {Number(kit.preco).toFixed(2).replace('.', ',')}</p><p className="mt-1 text-[10px] font-bold text-stone-400">{getKitItemQuantity(kit.product_kit_items)} item(ns) · SKU {kit.sku_sankhya || '—'} · {kit.estoque} un.</p><button type="button" onClick={() => openEdit(kit)} className="mt-3 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold hover:bg-stone-50">Editar</button></div></article>; })}{!isLoading && kits.length === 0 && <p className="text-sm font-bold text-stone-400">Nenhum kit cadastrado.</p>}</div>
  </section>;
}
