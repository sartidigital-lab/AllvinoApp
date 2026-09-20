const SMALL_WORDS = new Set(['a', 'as', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'na', 'nas', 'no', 'nos', 'o', 'os', 'para', 'por']);

/** Formats customer-facing product metadata without changing SKU, numeric or URL fields. */
export function formatProductText(value: string): string {
  const compact = value.trim().replace(/\s+/g, ' ');
  if (!compact) return '';

  return compact
    .toLocaleLowerCase('pt-BR')
    .split(' ')
    .map((word, index) => {
      if (index > 0 && SMALL_WORDS.has(word)) return word;
      return `${word.charAt(0).toLocaleUpperCase('pt-BR')}${word.slice(1)}`;
    })
    .join(' ');
}

export function formatProductDescription(value: string): string {
  const compact = value.trim().replace(/\s+/g, ' ');
  if (!compact) return '';

  const normalized = compact.toLocaleLowerCase('pt-BR');
  return `${normalized.charAt(0).toLocaleUpperCase('pt-BR')}${normalized.slice(1)}`;
}
