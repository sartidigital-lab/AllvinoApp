type SpreadsheetRow = Record<string, unknown>;

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function parseCsvLine(line: string) {
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

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvRows(text: string): SpreadsheetRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim());
  const [headersLine, ...dataLines] = lines;

  if (!headersLine) return [];

  const headers = parseCsvLine(headersLine);
  return dataLines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
}

export async function readStockImportRows(file: File): Promise<SpreadsheetRow[]> {
  const extension = getFileExtension(file.name);

  if (extension === 'csv' || file.type === 'text/csv') {
    return parseCsvRows(await file.text());
  }

  throw new Error('Envie um arquivo .csv exportado da planilha de estoque.');
}
