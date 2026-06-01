"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createWine, deleteWine, fetchWinesFromSupabase, updateWine } from '@/lib/database/wines';
import { fetchStockLevelByCode, normalizeProductCode } from '@/lib/database/stock';
import { createClient } from '@/utils/supabase/client';
import { Wine } from '@/types/database';

type WineForm = {
  name: string;
  description: string;
  price: string;
  product_code: string;
  image_url: string;
  type: string;
  region: string;
  grape: string;
  stock: string;
  category: string;
};

const emptyForm: WineForm = {
  name: '',
  description: '',
  price: '',
  product_code: '',
  image_url: '',
  type: '',
  region: '',
  grape: '',
  stock: '0',
  category: '',
};

const allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp'];

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }
  return '';
}

function toForm(wine: Wine): WineForm {
  return {
    name: wine.name,
    description: wine.description || '',
    price: String(wine.price),
    product_code: wine.product_code || '',
    image_url: wine.image_url || '',
    type: wine.type || '',
    region: wine.region || '',
    grape: wine.grape || '',
    stock: String(wine.stock),
    category: wine.category || '',
  };
}

function toPayload(form: WineForm): Partial<Wine> {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    price: Number(form.price),
    product_code: form.product_code.trim() || null,
    image_url: form.image_url.trim() || null,
    type: form.type.trim() || null,
    region: form.region.trim() || null,
    grape: form.grape.trim() || null,
    stock: Number(form.stock || 0),
    category: form.category.trim() || null,
  };
}

export default function AdminCatalogPage() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<WineForm>(emptyForm);
  const [editingWine, setEditingWine] = useState<Wine | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSyncingStock, setIsSyncingStock] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadWines();
  }, []);

  const filteredWines = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return wines;

    return wines.filter((wine) =>
      [wine.name, wine.product_code, wine.type, wine.category, wine.grape, wine.region]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    );
  }, [search, wines]);

  const loadWines = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const data = await fetchWinesFromSupabase({ usePublicCache: false });
      setWines(data);
    } catch (error) {
      console.error(error);
      setMessage('Nao foi possivel carregar o catalogo.');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingWine(null);
    setForm(emptyForm);
    setIsFormOpen(true);
    setMessage(null);
  };

  const openEditForm = (wine: Wine) => {
    setEditingWine(wine);
    setForm(toForm(wine));
    setIsFormOpen(true);
    setMessage(null);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingWine(null);
    setForm(emptyForm);
  };

  const syncStockFromProductCode = async (productCode: string, options: { showMessage?: boolean } = {}) => {
    const normalizedCode = normalizeProductCode(productCode);
    if (!normalizedCode) return null;

    setIsSyncingStock(true);

    try {
      const { quantity, error } = await fetchStockLevelByCode(normalizedCode);

      if (error) {
        if (options.showMessage) {
          setMessage('Nao foi possivel consultar o estoque importado para este codigo.');
        }
        return null;
      }

      if (quantity === null) {
        if (options.showMessage) {
          setMessage(`Codigo ${normalizedCode} ainda nao existe na base de estoque importada.`);
        }
        return null;
      }

      setForm((current) => ({
        ...current,
        product_code: normalizedCode,
        stock: String(quantity),
      }));

      if (options.showMessage) {
        setMessage(`Estoque sincronizado: ${quantity} un. para o codigo ${normalizedCode}.`);
      }

      return quantity;
    } finally {
      setIsSyncingStock(false);
    }
  };

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return;

    if (!allowedImageTypes.includes(file.type)) {
      setMessage('Envie uma imagem PNG, JPG, JPEG ou WebP.');
      return;
    }

    setIsUploadingImage(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const safeName = form.name.trim()
        ? form.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : 'produto';
      const filePath = `${Date.now()}-${safeName}.${extension}`;

      const { error } = await supabase.storage
        .from('produtos')
        .upload(filePath, file, {
          cacheControl: '31536000',
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        setMessage('Nao foi possivel enviar a imagem. Verifique sua permissao de admin.');
        return;
      }

      const { data } = supabase.storage.from('produtos').getPublicUrl(filePath);
      setForm((current) => ({ ...current, image_url: data.publicUrl }));
      setMessage('Imagem enviada com sucesso.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setMessage('Informe o nome do vinho.');
      return;
    }

    if (!form.price || Number(form.price) < 0) {
      setMessage('Informe um preco valido.');
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const normalizedProductCode = normalizeProductCode(form.product_code);
      const syncedQuantity = normalizedProductCode
        ? await syncStockFromProductCode(normalizedProductCode)
        : null;
      const payload = toPayload({
        ...form,
        product_code: normalizedProductCode,
        stock: syncedQuantity === null ? form.stock : String(syncedQuantity),
      });
      const savedWine = editingWine
        ? await updateWine(editingWine.id, payload)
        : await createWine(payload);

      if (!savedWine) {
        setMessage('Nao foi possivel salvar. Verifique sua permissao de admin.');
        return;
      }

      await loadWines();
      closeForm();
      setMessage(editingWine ? 'Vinho atualizado.' : 'Vinho cadastrado.');
    } catch (error) {
      const detail = getErrorMessage(error);
      setMessage(`Nao foi possivel salvar.${detail ? ` Detalhe: ${detail}` : ' Verifique sua permissao de admin.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (wine: Wine) => {
    if (!confirm(`Excluir "${wine.name}" do catalogo?`)) return;

    setMessage(null);
    const wasDeleted = await deleteWine(wine.id);
    if (!wasDeleted) {
      setMessage('Nao foi possivel excluir. Verifique sua permissao de admin.');
      return;
    }

    await loadWines();
    setMessage('Vinho excluido.');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-stone-200 pb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-black">Catalogo de Vinhos</h1>
          <p className="text-stone-500 mt-1 font-bold">Gerencie produtos, estoque e informacoes comerciais.</p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="bg-black text-white px-5 py-2.5 rounded-lg font-bold shadow-lg hover:bg-stone-800 transition flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Novo Vinho
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <label className="relative w-full md:max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[20px]">search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, uva, regiao..."
            className="w-full border border-stone-200 bg-white rounded-lg py-2.5 pl-10 pr-3 text-sm font-bold outline-none focus:border-black"
          />
        </label>
        <button
          type="button"
          onClick={loadWines}
          className="border border-stone-200 bg-white text-black px-4 py-2.5 rounded-lg font-bold hover:bg-stone-50 transition flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
          Atualizar
        </button>
      </div>

      {message && (
        <div className="border border-stone-200 bg-white px-4 py-3 rounded-lg text-sm font-bold text-stone-700">
          {message}
        </div>
      )}

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white border border-stone-100 shadow-sm rounded-lg p-5 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-black">{editingWine ? 'Editar vinho' : 'Novo vinho'}</h2>
            <button type="button" onClick={closeForm} className="text-stone-500 hover:text-black">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-bold uppercase text-stone-400">Nome</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full border border-stone-200 rounded-lg p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Preco</span>
              <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="w-full border border-stone-200 rounded-lg p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Codigo estoque</span>
              <input
                value={form.product_code}
                onBlur={(event) => syncStockFromProductCode(event.target.value, { showMessage: true })}
                onChange={(event) => setForm({ ...form, product_code: normalizeProductCode(event.target.value) })}
                className="w-full border border-stone-200 rounded-lg p-3 text-sm font-bold uppercase outline-none focus:border-black"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Estoque</span>
              <input type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} className="w-full border border-stone-200 rounded-lg p-3 text-sm font-bold outline-none focus:border-black" />
              {isSyncingStock && <p className="text-xs font-bold text-stone-400">Sincronizando estoque...</p>}
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Tipo</span>
              <input value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="w-full border border-stone-200 rounded-lg p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Categoria</span>
              <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="w-full border border-stone-200 rounded-lg p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Uva</span>
              <input value={form.grape} onChange={(event) => setForm({ ...form, grape: event.target.value })} className="w-full border border-stone-200 rounded-lg p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Regiao</span>
              <input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} className="w-full border border-stone-200 rounded-lg p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <div className="space-y-2 lg:col-span-2">
              <span className="text-xs font-bold uppercase text-stone-400">Imagem do produto</span>
              <div className="flex flex-col gap-3 rounded-lg border border-stone-200 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded bg-stone-50">
                    {form.image_url ? (
                      <img src={form.image_url} alt="Preview do produto" className="h-full w-full object-contain rounded" />
                    ) : (
                      <span className="material-symbols-outlined text-stone-300">image</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white transition hover:bg-stone-800">
                      <span className="material-symbols-outlined text-[18px]">upload</span>
                      {isUploadingImage ? 'Enviando...' : 'Subir imagem'}
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                        disabled={isUploadingImage}
                        onChange={(event) => handleImageUpload(event.target.files?.[0])}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs font-bold text-stone-400">PNG, JPG, JPEG ou WebP. A URL sera preenchida automaticamente.</p>
                  </div>
                </div>
                <input
                  value={form.image_url}
                  readOnly
                  placeholder="URL gerada automaticamente apos upload"
                  className="w-full border border-stone-200 bg-stone-50 rounded-lg p-3 text-xs font-bold text-stone-500 outline-none"
                />
              </div>
            </div>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-bold uppercase text-stone-400">Descricao</span>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="w-full border border-stone-200 rounded-lg p-3 text-sm font-bold outline-none focus:border-black resize-none" />
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeForm} className="border border-stone-200 px-4 py-2.5 rounded-lg font-bold text-stone-600 hover:bg-stone-50">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="bg-[#B91C1C] text-white px-5 py-2.5 rounded-lg font-bold hover:bg-red-800 disabled:opacity-60">
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-stone-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FDFBF7] text-stone-500 text-xs uppercase tracking-wider border-b border-stone-100">
                <th className="p-4 font-bold">Produto</th>
                <th className="p-4 font-bold">Tipo / Categoria</th>
                <th className="p-4 font-bold">Preco</th>
                <th className="p-4 font-bold">Estoque</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-center">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500 font-bold">Carregando catalogo...</td>
                </tr>
              ) : filteredWines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500 font-bold">Nenhum vinho encontrado.</td>
                </tr>
              ) : filteredWines.map((wine) => (
                <tr key={wine.id} className="hover:bg-stone-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-4 min-w-72">
                      <img src={wine.image_url || 'https://via.placeholder.com/50x150'} alt={wine.name} className="h-16 w-12 object-contain bg-stone-50 rounded" />
                      <div>
                        <p className="font-bold text-black">{wine.name}</p>
                        <p className="text-xs text-stone-400 font-bold">{wine.product_code || 'Sem codigo'} | {wine.grape || 'Uva'} | {wine.region || 'Regiao'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-xs font-bold uppercase">{wine.type || wine.category || 'Vinho'}</span>
                  </td>
                  <td className="p-4 font-bold text-black">R$ {wine.price.toFixed(2).replace('.', ',')}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${wine.stock > 10 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                      {wine.stock} un.
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-green-600 font-bold flex items-center gap-1 text-sm">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Ativo
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openEditForm(wine)} className="text-blue-500 hover:text-blue-700 p-1" title="Editar">
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button onClick={() => handleDelete(wine)} className="text-red-500 hover:text-red-700 p-1" title="Excluir">
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
