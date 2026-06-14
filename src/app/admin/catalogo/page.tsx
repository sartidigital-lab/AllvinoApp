"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AdminEmptyState, AdminNotice, AdminPageHeader, AdminSection, AdminStatCard, AdminStatusBadge } from '@/components/admin/AdminPrimitives';
import { createWine, deleteWine, fetchWinesFromSupabase, updateWine } from '@/lib/database/wines';
import { fetchStockLevelByCode, fetchStockLevelsByCodes, normalizeProductCode } from '@/lib/database/stock';
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

type StockLinkStatus = {
  label: string;
  detail: string;
  icon: string;
  className: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }
  return '';
}

function parseUploadError(status: number, responseText: string) {
  if (!responseText) return `Erro HTTP ${status}.`;

  try {
    const payload = JSON.parse(responseText) as { error?: unknown };
    if (payload.error) return String(payload.error);
  } catch {
    // The route may return an HTML error page during local/proxy failures.
  }

  return `Erro HTTP ${status}: ${responseText.slice(0, 180)}`;
}

function getStockLinkStatus(wine: Wine, stockByCode: Map<string, number>): StockLinkStatus {
  const productCode = normalizeProductCode(wine.product_code || '');

  if (!productCode) {
    return {
      label: 'Sem código',
      detail: 'Produto não vinculado ao estoque',
      icon: 'link_off',
      className: 'bg-stone-100 text-stone-600',
    };
  }

  if (!stockByCode.has(productCode)) {
    return {
      label: 'Código sem saldo',
      detail: 'Não existe na base importada',
      icon: 'warning',
      className: 'bg-amber-50 text-amber-700',
    };
  }

  const importedQuantity = stockByCode.get(productCode) || 0;

  if (importedQuantity !== wine.stock) {
    return {
      label: 'Divergente',
      detail: `Base: ${importedQuantity} un. | Produto: ${wine.stock} un.`,
      icon: 'sync_problem',
      className: 'bg-red-50 text-red-700',
    };
  }

  return {
    label: 'Vinculado',
    detail: `${importedQuantity} un. sincronizadas`,
    icon: 'check_circle',
    className: 'bg-emerald-50 text-emerald-700',
  };
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
  const [stockByCode, setStockByCode] = useState<Map<string, number>>(new Map());
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

  const summary = useMemo(() => {
    return wines.reduce(
      (acc, wine) => {
        acc.total += 1;
        if (wine.stock <= 5) acc.lowStock += 1;
        if (wine.image_url) acc.withImage += 1;
        return acc;
      },
      { total: 0, lowStock: 0, withImage: 0 }
    );
  }, [wines]);

  const loadWines = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const data = await fetchWinesFromSupabase({ usePublicCache: false });
      const productCodes = data
        .map((wine) => wine.product_code || '')
        .filter(Boolean);
      const { stockByCode: nextStockByCode, error: stockError } = await fetchStockLevelsByCodes(productCodes);

      if (stockError) {
        setMessage('Catálogo carregado, mas não foi possível validar vínculos de estoque.');
      }

      setStockByCode(nextStockByCode);
      setWines(data);
    } catch (error) {
      console.error(error);
      setMessage('Não foi possível carregar o catálogo.');
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
          setMessage('Não foi possível consultar o estoque importado para este código.');
        }
        return null;
      }

      if (quantity === null) {
        if (options.showMessage) {
          setMessage(`Código ${normalizedCode} ainda não existe na base de estoque importada.`);
        }
        return null;
      }

      setForm((current) => ({
        ...current,
        product_code: normalizedCode,
        stock: String(quantity),
      }));

      if (options.showMessage) {
        setMessage(`Estoque sincronizado: ${quantity} un. para o código ${normalizedCode}.`);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const {
        data: { session: refreshedSession },
      } = await supabase.auth.refreshSession();
      const activeSession = refreshedSession || session;

      if (!activeSession?.access_token) {
        setMessage('Sessão expirada. Entre novamente para enviar imagens.');
        return;
      }

      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('productName', form.name || editingWine?.name || 'produto');
      uploadData.append('accessToken', activeSession.access_token);

      const response = await fetch('/api/admin/produtos/imagem', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${activeSession.access_token}`,
        },
        body: uploadData,
      });
      const responseText = await response.text();

      if (!response.ok) {
        setMessage(`Não foi possível enviar a imagem. Detalhe: ${parseUploadError(response.status, responseText)}`);
        return;
      }

      const payload = responseText ? JSON.parse(responseText) as { publicUrl?: string } : {};

      if (!payload.publicUrl) {
        setMessage('Imagem enviada, mas a URL pública não foi retornada.');
        return;
      }

      setForm((current) => ({ ...current, image_url: payload.publicUrl }));
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
      setMessage('Informe um preço válido.');
      return;
    }

    if (!form.product_code.trim()) {
      setMessage('Informe o código de estoque do produto.');
      return;
    }

    if (!form.category.trim()) {
      setMessage('Informe o país do produto.');
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const normalizedProductCode = normalizeProductCode(form.product_code);
      const syncedQuantity = normalizedProductCode
        ? await syncStockFromProductCode(normalizedProductCode)
        : null;

      if (syncedQuantity === null) {
        setMessage(`Código ${normalizedProductCode} não encontrado na base de estoque. Importe a planilha ou cadastre este código em Estoque antes de salvar o produto.`);
        return;
      }

      const payload = toPayload({
        ...form,
        product_code: normalizedProductCode,
        stock: syncedQuantity === null ? form.stock : String(syncedQuantity),
      });
      const savedWine = editingWine
        ? await updateWine(editingWine.id, payload)
        : await createWine(payload);

      if (!savedWine) {
        setMessage('Não foi possível salvar. Verifique sua permissão de admin.');
        return;
      }

      await loadWines();
      closeForm();
      setMessage(editingWine ? 'Vinho atualizado.' : 'Vinho cadastrado.');
    } catch (error) {
      const detail = getErrorMessage(error);
      setMessage(`Não foi possível salvar.${detail ? ` Detalhe: ${detail}` : ' Verifique sua permissão de admin.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (wine: Wine) => {
    if (!confirm(`Excluir "${wine.name}" do catálogo?`)) return;

    setMessage(null);
    const wasDeleted = await deleteWine(wine.id);
    if (!wasDeleted) {
      setMessage('Não foi possível excluir. Verifique sua permissão de admin.');
      return;
    }

    await loadWines();
    setMessage('Vinho excluído.');
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Catálogo de Vinhos"
        description="Gerencie produtos, imagens, estoque e informações comerciais."
        actions={(
          <button
            type="button"
            onClick={openCreateForm}
            className="admin-button flex items-center gap-2 bg-black px-5 text-sm text-white shadow-sm hover:bg-stone-800"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Novo Vinho
          </button>
        )}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <AdminStatCard label="Produtos" value={summary.total} icon="wine_bar" tone="dark" />
        <AdminStatCard label="Com imagem" value={summary.withImage} icon="image" />
        <AdminStatCard label="Estoque baixo" value={summary.lowStock} icon="production_quantity_limits" tone="accent" />
      </div>

      <div className="admin-surface flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <label className="relative w-full md:max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-[20px]">search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, uva, país, região..."
            className="h-11 w-full rounded-lg border border-stone-200 bg-white pl-10 pr-3 text-sm font-bold outline-none transition focus:border-black"
          />
        </label>
        <button
          type="button"
          onClick={loadWines}
          className="admin-button flex items-center justify-center gap-2 border border-stone-200 bg-white px-4 text-sm text-black hover:bg-stone-50"
        >
          <span className="material-symbols-outlined text-[20px]">refresh</span>
          Atualizar
        </button>
      </div>

      {message && (
        <AdminNotice>{message}</AdminNotice>
      )}

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="admin-surface space-y-5 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-black">{editingWine ? 'Editar vinho' : 'Novo vinho'}</h2>
            <button type="button" onClick={closeForm} className="admin-button flex h-10 w-10 items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-black" aria-label="Fechar formulário">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-bold uppercase text-stone-400">Nome</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Preco</span>
              <input type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Código estoque</span>
              <input
                value={form.product_code}
                onBlur={(event) => syncStockFromProductCode(event.target.value, { showMessage: true })}
                onChange={(event) => setForm({ ...form, product_code: normalizeProductCode(event.target.value) })}
                className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold uppercase outline-none focus:border-black"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Estoque</span>
              <input type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black" />
              {isSyncingStock && <p className="text-xs font-bold text-stone-400">Sincronizando estoque...</p>}
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Tipo</span>
              <input value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">País</span>
              <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Uva</span>
              <input value={form.grape} onChange={(event) => setForm({ ...form, grape: event.target.value })} className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-stone-400">Região</span>
              <input value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black" />
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
                    <label className="admin-button inline-flex cursor-pointer items-center gap-2 bg-black px-4 text-sm text-white transition hover:bg-stone-800">
                      <span className="material-symbols-outlined text-[18px]">upload</span>
                      {isUploadingImage ? 'Enviando...' : 'Subir imagem'}
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                        disabled={isUploadingImage}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.currentTarget.value = '';
                          handleImageUpload(file);
                        }}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs font-bold text-stone-400">PNG, JPG, JPEG ou WebP. A URL será preenchida automaticamente.</p>
                  </div>
                </div>
                <input
                  value={form.image_url}
                  readOnly
                  placeholder="URL gerada automaticamente após upload"
                  className="w-full border border-stone-200 bg-stone-50 rounded-lg p-3 text-xs font-bold text-stone-500 outline-none"
                />
              </div>
            </div>
            <label className="space-y-1 lg:col-span-2">
              <span className="text-xs font-bold uppercase text-stone-400">Descrição</span>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="w-full resize-none rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black" />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeForm} className="admin-button border border-stone-200 px-4 text-sm text-stone-600 hover:bg-stone-50">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="admin-button bg-[#B91C1C] px-5 text-sm text-white hover:bg-red-800 disabled:opacity-60">
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      <AdminSection title="Produtos cadastrados" icon="inventory_2">
        {isLoading ? (
          <AdminEmptyState icon="hourglass_top" title="Carregando catálogo..." />
        ) : filteredWines.length === 0 ? (
          <AdminEmptyState
            icon="search_off"
            title="Nenhum vinho encontrado"
            description="Ajuste a busca ou cadastre um novo produto no catálogo."
            action={(
              <button type="button" onClick={openCreateForm} className="admin-button bg-black px-4 text-sm text-white hover:bg-stone-800">
                Novo Vinho
              </button>
            )}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {filteredWines.map((wine) => {
                const stockStatus = getStockLinkStatus(wine, stockByCode);

                return (
                  <article key={wine.id} className="rounded-lg border border-stone-100 bg-white p-4">
                    <div className="flex gap-3">
                      <img src={wine.image_url || 'https://via.placeholder.com/50x150'} alt={wine.name} className="h-24 w-16 shrink-0 rounded bg-stone-50 object-contain" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-bold text-black">{wine.name}</p>
                        <p className="mt-1 text-xs font-bold text-stone-400">{wine.product_code || 'Sem código'}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <AdminStatusBadge tone="neutral">{[wine.type, wine.category].filter(Boolean).join(' / ') || 'Vinho'}</AdminStatusBadge>
                          <AdminStatusBadge tone={wine.stock > 10 ? 'success' : 'danger'}>{wine.stock} un.</AdminStatusBadge>
                        </div>
                      </div>
                    </div>
                    <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-bold ${stockStatus.className}`}>
                      <span className="material-symbols-outlined text-[16px]">{stockStatus.icon}</span>
                      <div>
                        <p>{stockStatus.label}</p>
                        <p className="opacity-70">{stockStatus.detail}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button onClick={() => openEditForm(wine)} className="admin-button flex items-center justify-center gap-2 border border-stone-200 text-sm text-stone-700 hover:bg-stone-50" type="button">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                        Editar
                      </button>
                      <button onClick={() => handleDelete(wine)} className="admin-button flex items-center justify-center gap-2 border border-red-100 text-sm text-red-700 hover:bg-red-50" type="button">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                        Excluir
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FDFBF7] text-stone-500 text-xs uppercase tracking-wider border-b border-stone-100">
                <th className="p-4 font-bold">Produto</th>
                <th className="p-4 font-bold">Tipo / País</th>
                <th className="p-4 font-bold">Preco</th>
                <th className="p-4 font-bold">Estoque</th>
                <th className="p-4 font-bold">Vínculo estoque</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-center">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredWines.map((wine) => {
                const stockStatus = getStockLinkStatus(wine, stockByCode);

                return (
                <tr key={wine.id} className="hover:bg-stone-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-4 min-w-72">
                      <img src={wine.image_url || 'https://via.placeholder.com/50x150'} alt={wine.name} className="h-16 w-12 object-contain bg-stone-50 rounded" />
                      <div>
                        <p className="font-bold text-black">{wine.name}</p>
                        <p className="text-xs text-stone-400 font-bold">{wine.product_code || 'Sem código'} | {wine.grape || 'Uva'} | {wine.category || 'País'} | {wine.region || 'Região'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <AdminStatusBadge tone="neutral">{[wine.type, wine.category].filter(Boolean).join(' / ') || 'Vinho'}</AdminStatusBadge>
                  </td>
                  <td className="p-4 font-bold text-black">R$ {wine.price.toFixed(2).replace('.', ',')}</td>
                  <td className="p-4">
                    <AdminStatusBadge tone={wine.stock > 10 ? 'success' : 'danger'}>{wine.stock} un.</AdminStatusBadge>
                  </td>
                  <td className="p-4">
                    <div className={`inline-flex min-w-36 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${stockStatus.className}`}>
                      <span className="material-symbols-outlined text-[16px]">{stockStatus.icon}</span>
                      <div>
                        <p>{stockStatus.label}</p>
                        <p className="font-bold opacity-70">{stockStatus.detail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <AdminStatusBadge icon="check_circle" tone="success">
                      Ativo
                    </AdminStatusBadge>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openEditForm(wine)} className="admin-button flex h-10 w-10 items-center justify-center text-blue-500 hover:bg-blue-50 hover:text-blue-700" title="Editar" type="button">
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button onClick={() => handleDelete(wine)} className="admin-button flex h-10 w-10 items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-700" title="Excluir" type="button">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
            </div>
          </>
        )}
      </AdminSection>
    </div>
  );
}
