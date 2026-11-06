export type PricingImportRow = {
  product_code: string;
  price_from: number;
  price_to: number | null;
};

type SpreadsheetRow = Record<string, unknown>;

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getCell(row: SpreadsheetRow, candidates: string[]) {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [normalizeHeader(key), value] as const);
  return candidates
    .map(normalizeHeader)
    .map((candidate) => normalizedEntries.find(([key]) => key === candidate)?.[1])
    .find((value) => value !== undefined);
}

function parsePrice(value: unknown) {
  if (typeof value === 'number') return value;
  const text = String(value ?? '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .trim();
  if (!text) return Number.NaN;
  if (text.includes(',')) return Number(text.replace(/\./g, '').replace(',', '.'));
  if (/^\d{1,3}(?:\.\d{3})+$/.test(text)) return Number(text.replace(/\./g, ''));
  return Number(text);
}

function normalizeProductCode(value: unknown) {
  return String(value ?? '').trim().toUpperCase();
}

export function parsePricingRows(rows: SpreadsheetRow[]): PricingImportRow[] {
  const parsed = rows.map((row, index) => {
    const productCode = normalizeProductCode(getCell(row, [
      'Código', 'Codigo', 'Código do Produto', 'Codigo do Produto', 'SKU', 'SKU Sankhya',
    ]));
    const priceFrom = parsePrice(getCell(row, ['Preço DE', 'Preco DE', 'Preço De', 'Preco De']));
    const priceToValue = getCell(row, ['Preço POR', 'Preco POR', 'Preço Por', 'Preco Por']);
    const priceTo = String(priceToValue ?? '').trim() === '' ? null : parsePrice(priceToValue);
    const rowNumber = index + 2;

    if (!productCode) throw new Error(`Linha ${rowNumber}: informe o Código do produto.`);
    if (!Number.isFinite(priceFrom) || priceFrom <= 0) throw new Error(`Linha ${rowNumber}: Preço DE deve ser maior que zero.`);
    if (priceTo !== null && (!Number.isFinite(priceTo) || priceTo <= 0 || priceTo >= priceFrom)) {
      throw new Error(`Linha ${rowNumber}: Preço POR deve ser maior que zero e menor que o Preço DE.`);
    }

    return { product_code: productCode, price_from: priceFrom, price_to: priceTo };
  });

  const duplicate = parsed.find((row, index) => parsed.findIndex((candidate) => candidate.product_code === row.product_code) !== index);
  if (duplicate) throw new Error(`O código ${duplicate.product_code} aparece mais de uma vez na planilha.`);
  return parsed;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  })[character] || character);
}

function escapeSpreadsheetFormula(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function columnName(index: number) {
  let value = index + 1;
  let output = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    output = String.fromCharCode(65 + remainder) + output;
    value = Math.floor((value - 1) / 26);
  }
  return output;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value: number) { return new Uint8Array([value & 255, (value >>> 8) & 255]); }
function uint32(value: number) { return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]); }

function joinBytes(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  parts.forEach((part) => { output.set(part, offset); offset += part.length; });
  return output;
}

function createZip(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  files.forEach(({ name, content }) => {
    const nameBytes = encoder.encode(name); const contentBytes = encoder.encode(content); const checksum = crc32(contentBytes);
    const local = joinBytes([uint32(0x04034b50), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint32(checksum), uint32(contentBytes.length), uint32(contentBytes.length), uint16(nameBytes.length), uint16(0), nameBytes, contentBytes]);
    localParts.push(local);
    centralParts.push(joinBytes([uint32(0x02014b50), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint32(checksum), uint32(contentBytes.length), uint32(contentBytes.length), uint16(nameBytes.length), uint16(0), uint16(0), uint16(0), uint16(0), uint32(0), uint32(offset), nameBytes]));
    offset += local.length;
  });

  const central = joinBytes(centralParts);
  return joinBytes([...localParts, central, uint32(0x06054b50), uint16(0), uint16(0), uint16(files.length), uint16(files.length), uint32(central.length), uint32(offset), uint16(0)]);
}

export type CatalogExportRow = {
  product_code: string | null;
  name: string;
  original_price?: number | null;
  price: number;
  stock: number;
};

export function createCatalogXlsx(rows: CatalogExportRow[]) {
  const table = [
    ['Código', 'Nome do produto', 'Preço DE', 'Preço POR', 'Estoque'],
    ...rows.map((row) => [
      escapeSpreadsheetFormula(row.product_code || ''),
      escapeSpreadsheetFormula(row.name || ''),
      Number(row.original_price ?? row.price),
      row.original_price != null && Number(row.original_price) > Number(row.price) ? Number(row.price) : '',
      Number(row.stock || 0),
    ]),
  ];
  const sheetRows = table.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((cell, columnIndex) => {
    const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
    return typeof cell === 'number'
      ? `<c r="${reference}"><v>${cell}</v></c>`
      : `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(String(cell))}</t></is></c>`;
  }).join('')}</row>`).join('');
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="18" customWidth="1"/><col min="2" max="2" width="42" customWidth="1"/><col min="3" max="4" width="14" customWidth="1"/><col min="5" max="5" width="12" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData></worksheet>`;
  return createZip([
    { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Catálogo" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
    { name: 'xl/worksheets/sheet1.xml', content: worksheet },
  ]);
}
