"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { fetchWinesFromSupabase } from '@/lib/database/wines';
import { AdminNotice } from '@/components/admin/AdminPrimitives';
import type { CatalogProductCategory, Wine } from '@/types/database';

type CategoryForm = {
  title: string;
  slug: string;
  sort_order: string;
  is_active: boolean;
  product_ids: string[];
};

type CategoryRow = Omit<CatalogProductCategory, 'items'> & {
  catalog_product_category_items: { product_id: string; sort_order: number }[] | null;
};

const emptyForm: CategoryForm = { title: '', slug: '', sort_order: '50', is_active: true, product_ids: [] };

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapCategory(row: CategoryRow): CatalogProductCategory {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    sort_order: Number(row.sort_order || 0),
    is_active: row.is_active,
    items: (row.catalog_product_category_items || [])
      .map((item) => ({ product_id: item.product_id, sort_order: Number(item.sort_order || 0) }))
      .sort((a, b) => a.sort_order - b.sort_order),
  };
}

export function ProductCategoriesManager() {
  const [categories, setCategories] = useState<CatalogProductCategory[]>([]);
  const [products, setProducts] = useState<Wine[]>([]);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editing, setEditing] = useState<CatalogProductCategory | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const [categoryResult, catalog] = await Promise.all([
      supabase
        .from('catalog_product_categories')
        .select('id,title,slug,sort_order,is_active,catalog_product_category_items(product_id,sort_order)')
        .order('sort_order', { ascending: true })
        .order('title', { ascending: true }),
      fetchWinesFromSupabase({ usePublicCache: false, includeUnpublished: true }).catch(() => []),
    ]);

    if (categoryResult.error) setMessage('Não foi possível carregar as categorias.');
    setCategories(((categoryResult.data || []) as CategoryRow[]).map(mapCategory));
    setProducts(catalog);
    setIsLoading(false);
  };

  useEffect(() => { void loadData(); }, []);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => [product.name, product.product_code, product.type]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(term)));
  }, [productSearch, products]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: String((categories.at(-1)?.sort_order || 0) + 10) });
    setProductSearch('');
    setMessage(null);
    setIsFormOpen(true);
  };

  const openEdit = (category: CatalogProductCategory) => {
    setEditing(category);
    setForm({
      title: category.title,
      slug: category.slug,
      sort_order: String(category.sort_order),
      is_active: category.is_active,
      product_ids: category.items.map((item) => item.product_id),
    });
    setProductSearch('');
    setMessage(null);
    setIsFormOpen(true);
  };

  const toggleProduct = (productId: string) => setForm((current) => ({
    ...current,
    product_ids: current.product_ids.includes(productId)
      ? current.product_ids.filter((id) => id !== productId)
      : [...current.product_ids, productId],
  }));

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = form.title.trim();
    const slug = slugify(form.slug || title);
    const sortOrder = Math.trunc(Number(form.sort_order));

    if (title.length < 2 || !slug || !Number.isFinite(sortOrder) || sortOrder < 0 || sortOrder > 9999) {
      setMessage('Informe nome, identificador e ordem válidos.');
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.rpc('save_catalog_product_category', {
      p_id: editing?.id || null,
      p_title: title,
      p_slug: slug,
      p_sort_order: sortOrder,
      p_is_active: form.is_active,
      p_product_ids: form.product_ids,
    });
    setIsSaving(false);

    if (error) {
      setMessage(`Não foi possível salvar a categoria: ${error.message}`);
      return;
    }

    await loadData();
    setIsFormOpen(false);
    setEditing(null);
    setMessage(editing ? 'Categoria atualizada.' : 'Categoria criada.');
  };

  const handleDelete = async (category: CatalogProductCategory) => {
    if (!confirm(`Excluir a categoria "${category.title}"?`)) return;
    const supabase = createClient();
    const { error } = await supabase.rpc('delete_catalog_product_category', { p_id: category.id });
    if (error) {
      setMessage(`Não foi possível excluir a categoria: ${error.message}`);
      return;
    }
    await loadData();
    setMessage('Categoria excluída.');
  };

  return (
    <section id="categorias" className="admin-surface space-y-5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#B91C1C]">Vitrine pública</p>
          <h2 className="mt-1 text-xl font-bold text-black">Categorias do catálogo</h2>
          <p className="mt-1 max-w-2xl text-sm font-medium text-stone-500">Defina as sessões, a ordem e os produtos de cada vitrine. “Todos os produtos” é automática e sempre mostra o catálogo inteiro.</p>
        </div>
        <button type="button" onClick={openCreate} className="admin-button bg-black px-4 text-sm text-white hover:bg-stone-800">Nova categoria</button>
      </div>

      {message && <AdminNotice>{message}</AdminNotice>}

      {isFormOpen && (
        <form onSubmit={handleSave} className="rounded-2xl border border-stone-200 bg-[#FDFBF7] p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 lg:col-span-2"><span className="text-xs font-bold uppercase text-stone-500">Nome da sessão</span><input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value, slug: current.slug || slugify(event.target.value) }))} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" placeholder="Ex.: Para presentear" /></label>
            <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Identificador</span><input required value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" placeholder="para-presentear" /><span className="block text-[10px] font-semibold text-stone-400">Usado apenas internamente.</span></label>
            <label className="space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Ordem na vitrine</span><input required type="number" min="0" max="9999" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} className="w-full rounded-lg border border-stone-200 bg-white p-3 font-bold" /></label>
            <label className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white p-3"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /><span className="text-sm font-bold">Exibir no catálogo</span></label>
          </div>

          <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><label className="w-full max-w-md space-y-1"><span className="text-xs font-bold uppercase text-stone-500">Produtos da sessão</span><input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar por nome ou código" className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold" /></label><p className="text-xs font-black text-[#B91C1C]">{form.product_ids.length} produto(s) selecionado(s)</p></div>
            <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => <label key={product.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2 ${form.product_ids.includes(product.id) ? 'border-[#741128] bg-red-50' : 'border-stone-200'}`}><input type="checkbox" checked={form.product_ids.includes(product.id)} onChange={() => toggleProduct(product.id)} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{product.name}</span><span className="block text-[10px] text-stone-400">{product.product_code || 'Sem código'} · {product.product_kind === 'kit' ? 'Kit' : product.type || 'Vinho'}</span></span></label>)}
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setIsFormOpen(false)} className="rounded-lg border border-stone-200 px-4 py-2.5 font-bold">Cancelar</button><button type="submit" disabled={isSaving} className="rounded-lg bg-[#B91C1C] px-5 py-2.5 font-bold text-white disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar categoria'}</button></div>
        </form>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? <p className="text-sm font-bold text-stone-400">Carregando categorias...</p> : categories.map((category) => <article key={category.id} className="rounded-2xl border border-stone-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-black">{category.title}</p><p className="mt-1 text-xs font-bold text-stone-400">/{category.slug} · posição {category.sort_order}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${category.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{category.is_active ? 'Ativa' : 'Pausada'}</span></div><p className="mt-3 text-xs font-bold text-stone-500">{category.items.length} produto(s) na vitrine</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => openEdit(category)} className="flex-1 rounded-lg border border-stone-200 py-2 text-xs font-bold hover:bg-stone-50">Editar</button><button type="button" onClick={() => handleDelete(category)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Excluir</button></div></article>)}
        {!isLoading && categories.length === 0 && <p className="text-sm font-bold text-stone-400">Nenhuma categoria criada.</p>}
      </div>
    </section>
  );
}
