import { readSheet } from 'read-excel-file/browser';

type SpreadsheetRow = Record<string, unknown>;

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMPORT_ROWS = 10_000;

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function parseCsvLine(line: string, delimiter: ',' | ';') {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function countDelimiter(line: string, delimiter: ',' | ';') {
  return parseCsvLine(line, delimiter).length;
}

function detectDelimiter(headerLine: string): ',' | ';' {
  return countDelimiter(headerLine, ';') > countDelimiter(headerLine, ',') ? ';' : ',';
}

export function parseCsvRows(text: string): SpreadsheetRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim());
  const [headersLine, ...dataLines] = lines;

  if (!headersLine) return [];

  const delimiter = detectDelimiter(headersLine);
  const headers = parseCsvLine(headersLine, delimiter);
  return dataLines.map((line) => {
    const values = parseCsvLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

function spreadsheetRowsToRecords(rows: unknown[][]): SpreadsheetRow[] {
  const [headerRow, ...dataRows] = rows;
  if (!headerRow) return [];

  const headers = headerRow.map((header) => String(header ?? '').trim());
  return dataRows
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined && String(cell).trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

export async function readStockImportRows(file: File): Promise<SpreadsheetRow[]> {
  const extension = getFileExtension(file.name);

  if (file.size > MAX_IMPORT_FILE_SIZE) {
    throw new Error('O arquivo deve ter no máximo 10 MB.');
  }

  let rows: SpreadsheetRow[];

  if (extension === 'csv' || file.type === 'text/csv') {
    rows = parseCsvRows(await file.text());
  } else if (
    extension === 'xlsx' ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    rows = spreadsheetRowsToRecords(await readSheet(file));
  } else {
    throw new Error('Envie um arquivo .xlsx ou .csv de estoque.');
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error('A planilha deve ter no máximo 10.000 linhas.');
  }

  return rows;
}
