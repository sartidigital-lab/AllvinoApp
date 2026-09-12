"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { AdminEmptyState, AdminNotice, AdminPageHeader, AdminSection, AdminStatCard, AdminStatusBadge } from '@/components/admin/AdminPrimitives';
import {
  fetchStockImports,
  fetchStockLevels,
  importStockLevels,
  normalizeProductCode,
  parseStockRows,
  saveManualStockLevel,
  StockLevelInput,
  StockLevelWithProduct,
} from '@/lib/database/stock';
import { readStockImportRows } from '@/lib/stock/importFile';
import { StockImport } from '@/types/database';

type ManualForm = {
  product_code: string;
  quantity: string;
};

type PendingImport = {
  fileName: string;
  rows: StockLevelInput[];
};

const STOCK_PAGE_SIZE = 50;

const emptyManualForm: ManualForm = {
  product_code: '',
  quantity: '0',
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }
  return '';
}

export default function AdminEstoquePage() {
  const [stockLevels, setStockLevels] = useState<StockLevelWithProduct[]>([]);
  const [imports, setImports] = useState<StockImport[]>([]);
  const [manualForm, setManualForm] = useState<ManualForm>(emptyManualForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStock = async () => {
    setIsLoading(true);
    setMessage(null);

    const [{ stockLevels: nextStockLevels, error }, { imports: nextImports }] = await Promise.all([
      fetchStockLevels(),
      fetchStockImports(),
    ]);

    if (error) {
      setMessage('Não foi possível carregar o estoque. Verifique sua permissão de admin.');
    }

    setStockLevels(nextStockLevels);
    setImports(nextImports);
    setIsLoading(false);
  };

  useEffect(() => {
    loadStock();
  }, []);

  const summary = useMemo(() => {
    return stockLevels.reduce(
      (acc, stock) => {
        acc.codes += 1;
        if (stock.product_name) {
          acc.linked += 1;
          acc.linkedUnits += stock.quantity;
          if (stock.quantity <= 5) acc.low += 1;
        } else {
          acc.unlinked += 1;
        }
        return acc;
      },
      { codes: 0, linked: 0, unlinked: 0, linkedUnits: 0, low: 0 }
    );
  }, [stockLevels]);

  const filteredStock = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return stockLevels;

    return stockLevels.filter((stock) =>
      [stock.product_code, stock.product_name]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
    );
  }, [searchTerm, stockLevels]);

  const totalPages = Math.max(1, Math.ceil(filteredStock.length / STOCK_PAGE_SIZE));
  const paginatedStock = filteredStock.slice(
    (currentPage - 1) * STOCK_PAGE_SIZE,
    currentPage * STOCK_PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setMessage(null);

    try {
      const rows = await readStockImportRows(file);
      const parsedRows = parseStockRows(rows);

      if (parsedRows.length === 0) {
        setMessage('Não encontrei colunas de código e quantidade. Use, por exemplo: Código do Produto e Estoque.');
        return;
      }

      setPendingImport({ fileName: file.name, rows: parsedRows });
      setMessage(`Arquivo validado: ${parsedRows.length} códigos prontos para importar.`);
    } catch (error) {
      const detail = getErrorMessage(error);
      setMessage(`Não foi possível ler o arquivo.${detail ? ` Detalhe: ${detail}` : ''}`);
    } finally {
      event.target.value = '';
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;

    setIsImporting(true);
    setMessage(null);
    const { count, error } = await importStockLevels(pendingImport.rows, pendingImport.fileName);

    if (error) {
      const detail = getErrorMessage(error);
      setMessage(`Não foi possível importar o estoque.${detail ? ` Detalhe: ${detail}` : ''}`);
      setIsImporting(false);
      return;
    }

    setPendingImport(null);
    await loadStock();
    setMessage(`${count} códigos de estoque importados.`);
    setIsImporting(false);
  };

  const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const productCode = normalizeProductCode(manualForm.product_code);
    const quantity = Number(manualForm.quantity);

    if (!productCode || !Number.isFinite(quantity) || quantity < 0) {
      setMessage('Informe código e quantidade válidos.');
      return;
    }

    setIsSavingManual(true);
    setMessage(null);

    const { error } = await saveManualStockLevel({
      product_code: productCode,
      quantity: Math.trunc(quantity),
    });

    if (error) {
      const detail = getErrorMessage(error);
      setMessage(`Não foi possível salvar o código avulso.${detail ? ` Detalhe: ${detail}` : ''}`);
      setIsSavingManual(false);
      return;
    }

    setManualForm(emptyManualForm);
    await loadStock();
    setMessage('Código de estoque salvo.');
    setIsSavingManual(false);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Estoque"
        description="Atualize saldos por código de produto via Excel, CSV ou cadastro avulso."
        actions={(
          <label className="admin-button flex cursor-pointer items-center gap-2 bg-black px-5 text-sm text-white shadow-sm transition hover:bg-stone-800">
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
            {isImporting ? 'Processando...' : 'Importar planilha'}
            <input
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              disabled={isImporting}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        )}
      />

      <div className="admin-stats-grid grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <AdminStatCard label="Códigos vinculados" value={summary.linked} icon="link" tone="dark" />
        <AdminStatCard label="Unidades vinculadas" value={summary.linkedUnits} icon="inventory_2" />
        <AdminStatCard label="Sem produto" value={summary.unlinked} icon="link_off" tone="warning" />
        <AdminStatCard label="Baixo estoque vinculado" value={summary.low} icon="production_quantity_limits" tone="accent" />
      </div>

      {message && (
        <AdminNotice>{message}</AdminNotice>
      )}

      {pendingImport && (
        <AdminSection title="Pré-visualização da importação" icon="preview">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-black">{pendingImport.fileName}</p>
                <p className="mt-1 text-xs font-bold text-stone-400">
                  {pendingImport.rows.length} códigos válidos; códigos repetidos usam o último saldo.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setPendingImport(null)} className="admin-button border border-stone-200 px-4 text-sm text-stone-600 hover:bg-stone-50">
                  Cancelar
                </button>
                <button type="button" onClick={handleConfirmImport} disabled={isImporting} className="admin-button bg-[#B91C1C] px-4 text-sm text-white hover:bg-red-800 disabled:opacity-60">
                  {isImporting ? 'Importando...' : 'Confirmar importação'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-stone-200">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="bg-stone-50 text-xs uppercase text-stone-400">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {pendingImport.rows.slice(0, 5).map((row) => (
                    <tr key={row.product_code}>
                      <td className="px-4 py-3 font-bold">{row.product_code}</td>
                      <td className="px-4 py-3">{row.quantity} un.</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AdminSection>
      )}

      <form onSubmit={handleManualSubmit} className="admin-surface grid grid-cols-1 gap-4 p-5 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase text-stone-400">Código avulso</span>
          <input
            value={manualForm.product_code}
            onChange={(event) => setManualForm({ ...manualForm, product_code: event.target.value.toUpperCase() })}
            placeholder="Ex.: 100234"
            className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold uppercase outline-none focus:border-black"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase text-stone-400">Quantidade</span>
          <input
            type="number"
            min="0"
            value={manualForm.quantity}
            onChange={(event) => setManualForm({ ...manualForm, quantity: event.target.value })}
            className="w-full rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none focus:border-black"
          />
        </label>
        <button
          type="submit"
          disabled={isSavingManual}
          className="admin-button bg-[#B91C1C] px-5 text-sm text-white transition hover:bg-red-800 disabled:opacity-60"
        >
          {isSavingManual ? 'Salvando...' : 'Salvar código'}
        </button>
      </form>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AdminSection title="Saldo atual por código" icon="inventory" actions={(
              <button
                type="button"
                onClick={loadStock}
                className="admin-button flex items-center gap-2 border border-stone-200 px-4 text-xs text-stone-600 hover:bg-stone-50"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Atualizar
              </button>
            )}>
          <div className="space-y-4">
            <label className="relative block">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-stone-400">
                search
              </span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por código ou produto"
                className="h-11 w-full rounded-lg border border-stone-200 bg-white pl-10 pr-3 text-sm font-bold text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-black"
              />
            </label>
          </div>

          {isLoading ? (
            <AdminEmptyState icon="hourglass_top" title="Carregando estoque..." />
          ) : filteredStock.length === 0 ? (
            <AdminEmptyState icon="search_off" title="Nenhum saldo encontrado" description="Ajuste a busca ou importe uma planilha de estoque." />
          ) : (
            <div className="divide-y divide-stone-100">
              {paginatedStock.map((stock) => (
                <div key={stock.product_code} className="grid grid-cols-1 gap-3 p-5 md:grid-cols-[minmax(0,1fr)_120px_160px] md:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-black">{stock.product_code}</p>
                    <p className="mt-1 truncate text-xs font-bold text-stone-400">{stock.product_name || 'Sem produto vinculado'}</p>
                  </div>
                  <AdminStatusBadge tone={stock.quantity <= 5 ? 'danger' : 'success'} className="w-fit">
                    {stock.quantity} un.
                  </AdminStatusBadge>
                  <p className="text-xs font-bold text-stone-400">{new Date(stock.updated_at).toLocaleString('pt-BR')}</p>
                </div>
              ))}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <p className="text-xs font-bold text-stone-400">
                    Página {currentPage} de {totalPages} · {filteredStock.length} códigos
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="admin-button border border-stone-200 px-4 text-xs disabled:opacity-40"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      className="admin-button border border-stone-200 px-4 text-xs disabled:opacity-40"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </AdminSection>

        <AdminSection title="Últimas importações" icon="history">
          <div className="space-y-3 xl:sticky xl:top-24 xl:self-start">
            {imports.length === 0 ? (
              <AdminEmptyState icon="upload_file" title="Nenhum arquivo importado" description="As importações recentes aparecerão aqui." />
            ) : (
              imports.map((stockImport) => (
                <div key={stockImport.id} className="rounded-lg border border-stone-100 p-3">
                  <p className="line-clamp-1 text-sm font-bold text-black">{stockImport.file_name || 'Arquivo sem nome'}</p>
                  <p className="mt-1 text-xs font-bold text-stone-400">{stockImport.total_rows} linhas importadas</p>
                  <p className="mt-1 text-xs font-bold text-stone-400">{new Date(stockImport.created_at).toLocaleString('pt-BR')}</p>
                </div>
              ))
            )}
          </div>
        </AdminSection>
      </div>
    </div>
  );
}
