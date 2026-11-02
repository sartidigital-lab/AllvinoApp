/**
 * Grapes are stored in the legacy `produtos.uva` text field. Keep the
 * conversion in one place so the admin form, product cards and filters agree
 * about what represents a varietal wine and a blend.
 */
export function parseGrapes(value: string | null | undefined): string[] {
  if (!value) return [];

  const seen = new Set<string>();

  return value
    .split(/[,;/]|\s+e\s+/i)
    .map((grape) => grape.trim())
    .filter((grape) => {
      if (!grape) return false;
      const key = grape.toLocaleLowerCase('pt-BR');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function serializeGrapes(grapes: string[]): string | null {
  const normalized = parseGrapes(grapes.join(', '));
  return normalized.length ? normalized.join(', ') : null;
}

export function getGrapeClassification(value: string | null | undefined): string | null {
  const grapes = parseGrapes(value);
  if (grapes.length === 0) return null;
  return grapes.length > 1 ? 'Blend' : grapes[0];
}
