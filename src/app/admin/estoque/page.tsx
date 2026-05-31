"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  fetchStockImports,
  fetchStockLevels,
  importStockLevels,
  normalizeProductCode,
  saveManualStockLevel,
  StockLevelInput,
  StockLevelWithProduct,
} from '@/lib/database/stock';
import { StockImport } from '@/types/database';

type ManualForm = {
  product_code: string;
  quantity: string;
};

const emptyManualForm: ManualForm = {
  product_code: '',
  quantity: '0',
};

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getCell(row: Record<string, unknown>, candidates: string[]) {
  const entry = Object.entries(row).find(([key]) =>
    candidates.includes(normalizeHeader(key))
  );
  return entry?.[1];
}

function parseQuantity(value: unknown) {
  if (typeof value === 'number') return Math.trunc(value);
  const normalized = String(value || '')
    .trim()
    .replace(/\./g, '')
    .replace(',', '.');
  return Math.trunc(Number(normalized || 0));
}

function parseStockRows(rows: Record<string, unknown>[]): StockLevelInput[] {
  const parsedRows = rows
    .map((row) => {
      const code = getCell(row, ['codigo', 'codigoproduto', 'codproduto', 'sku', 'produto', 'cod']);
      const quantity = getCell(row, ['quantidade', 'qtd', 'estoque', 'saldo', 'saldoestoque']);

      return {
        product_code: normalizeProductCode(String(code || '')),
        quantity: parseQuantity(quantity),
      };
    })
    .filter((row) => row.product_code && Number.isFinite(row.quantity) && row.quantity >= 0);

  const rowsByCode = new Map<string, StockLevelInput>();
  parsedRows.forEach((row) => rowsByCode.set(row.product_code, row));
  return [...rowsByCode.values()];
}

export default function AdminEstoquePage() {
  const [stockLevels, setStockLevels] = useState<StockLevelWithProduct[]>([]);
  const [imports, setImports] = useState<StockImport[]>([]);
  const [manualForm, setManualForm] = useState<ManualForm>(emptyManualForm);
  const [searchTerm, setSearchTerm] = useState('');
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
      setMessage('Nao foi possivel carregar o estoque. Verifique sua permissao de admin.');
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
        acc.units += stock.quantity;
        if (stock.quantity <= 5) acc.low += 1;
        return acc;
      },
      { codes: 0, units: 0, low: 0 }
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

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const parsedRows = parseStockRows(rows);

      if (parsedRows.length === 0) {
        setMessage('Nao encontrei colunas de codigo e quantidade na planilha.');
        setIsImporting(false);
        return;
      }

      const { count, error } = await importStockLevels(parsedRows, file.name);

      if (error) {
        setMessage('Nao foi possivel importar o estoque.');
        setIsImporting(false);
        return;
      }

      await loadStock();
      setMessage(`${count} codigos de estoque importados.`);
    } finally {
      event.target.value = '';
      setIsImporting(false);
    }
  };

  const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const productCode = normalizeProductCode(manualForm.product_code);
    const quantity = Number(manualForm.quantity);

    if (!productCode || !Number.isFinite(quantity) || quantity < 0) {
      setMessage('Informe codigo e quantidade validos.');
      return;
    }

    setIsSavingManual(true);
    setMessage(null);

    const { error } = await saveManualStockLevel({
      product_code: productCode,
    quantity: Math.trunc(quantity),
    });

    if (error) {
      setMessage('Nao foi possivel salvar o codigo avulso.');
      setIsSavingManual(false);
      return;
    }

    setManualForm(emptyManualForm);
    await loadStock();
    setMessage('Codigo de estoque salvo.');
    setIsSavingManual(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif text-black">Estoque</h1>
          <p className="mt-1 text-sm font-bold text-stone-500">Atualize saldo por codigo de produto via Excel ou cadastro avulso.</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-stone-800">
          <span className="material-symbols-outlined text-[20px]">upload_file</span>
          {isImporting ? 'Importando...' : 'Subir Excel'}
          <input
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            disabled={isImporting}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-black p-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Codigos</p>
          <p className="mt-2 text-3xl font-bold">{summary.codes}</p>
        </div>
        <div className="rounded-lg border border-stone-100 bg-white p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Unidades</p>
          <p className="mt-2 text-3xl font-bold text-black">{summary.units}</p>
        </div>
        <div className="rounded-lg border border-stone-100 bg-white p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Baixo estoque</p>
          <p className="mt-2 text-3xl font-bold text-black">{summary.low}</p>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-700">
          {message}
        </div>
      )}

      <form onSubmit={handleManualSubmit} className="grid grid-cols-1 gap-4 rounded-lg border border-stone-100 bg-white p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase text-stone-400">Codigo avulso</span>
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
          className="rounded-lg bg-[#B91C1C] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-60"
        >
          {isSavingManual ? 'Salvando...' : 'Salvar codigo'}
        </button>
      </form>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-lg border border-stone-100 bg-white shadow-sm">
          <div className="space-y-4 border-b border-stone-100 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-black">Saldo atual por codigo</h2>
              <button
                type="button"
                onClick={loadStock}
                className="flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Atualizar
              </button>
            </div>
            <label className="relative block">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-stone-400">
                search
              </span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por codigo ou produto"
                className="h-11 w-full rounded-lg border border-stone-200 bg-white pl-10 pr-3 text-sm font-bold text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-black"
              />
            </label>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm font-bold text-stone-400">Carregando estoque...</div>
          ) : filteredStock.length === 0 ? (
            <div className="p-8 text-center text-sm font-bold text-stone-400">Nenhum saldo encontrado.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filteredStock.map((stock) => (
                <div key={stock.product_code} className="grid grid-cols-1 gap-3 p-5 md:grid-cols-[minmax(0,1fr)_120px_160px] md:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-black">{stock.product_code}</p>
                    <p className="mt-1 truncate text-xs font-bold text-stone-400">{stock.product_name || 'Sem produto vinculado'}</p>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${stock.quantity <= 5 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {stock.quantity} un.
                  </span>
                  <p className="text-xs font-bold text-stone-400">{new Date(stock.updated_at).toLocaleString('pt-BR')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-lg border border-stone-100 bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:self-start">
          <h2 className="font-bold text-black">Ultimas importacoes</h2>
          <div className="mt-4 space-y-3">
            {imports.length === 0 ? (
              <p className="text-sm font-bold text-stone-400">Nenhum arquivo importado.</p>
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
        </aside>
      </div>
    </div>
  );
}
