import type { Material } from '../data/mockData';

/**
 * Picks a small, relevant subset of the material catalog to send to the AI,
 * so the prompt stays small regardless of total catalog size.
 *
 * Strategy:
 *   1. Tokenize the request text into normalized keywords.
 *   2. Score every material by overlap (name + brand + category).
 *   3. Take the top N. Pad with a curated "always-include" pool that gives
 *      the model coverage across common families (foam, sintra, vinilo, pvc, etc.)
 *      so it can still answer even when keywords are weak or missing.
 *
 * The wizard already has a MaterialsStep that lets the user resolve any
 * `unknownMaterials` the AI couldn't match — that's the safety net when our
 * filtering misses a SKU.
 */

const MAX_RESULTS = 50;
const MIN_TOKEN_LENGTH = 3;

// Family keywords → seed tokens that ensure relevant SKUs always score.
// These come from the DIPISA April 2025 catalog.
const SYNONYMS: Record<string, string[]> = {
  vinilo: ['vin', 'adhesivo', 'plotter'],
  pvc: ['banner', 'tela', 'lona', 'mesh', 'backlit'],
  foam: ['fomex', 'foamboard', 'cartonpluma'],
  sintra: ['trovicel', 'espumado'],
  cartulina: ['couche', 'opaco', 'papel'],
  papel: ['couche', 'bond', 'sintetico'],
  rigido: ['plancha', 'soporte', 'sintra', 'foam', 'pp', 'corrugado'],
  laminado: ['lam', 'frio'],
  reflectivo: ['reflective', 'avery', '3m'],
  fedrigoni: ['vinilo'],
  '3m': ['controltac', 'scotchcal', 'envision', 'scotchlite'],
  vehicular: ['ij180', 'controltac', 'polimerico', 'wrap'],
  decoracion: ['muro', 'vidrio', 'dusted', 'frosted'],
};

// Stop words — too generic to be useful as a signal.
const STOPWORDS = new Set([
  'para', 'con', 'sin', 'por', 'una', 'uno', 'unos', 'unas', 'del', 'los', 'las',
  'que', 'esta', 'este', 'estos', 'mas', 'mts', 'cms', 'cms2', 'unidades', 'unidad',
  'metros', 'metro', 'metr', 'pieza', 'piezas', 'item', 'items', 'cantidad',
  'medida', 'medidas', 'corte', 'cortes', 'precio', 'valor', 'neto', 'iva',
  'codigo', 'descripcion', 'marca', 'tipo', 'producto', 'cliente', 'pedido',
  'cotizacion', 'orden', 'archivo', 'hoja', 'sheet', 'name', 'gracias',
  'saludos', 'hola', 'buenos', 'dias', 'tardes', 'noches', 'favor',
]);

/** Normalize: lowercase + strip accents + non-alphanumeric. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract normalized tokens of length ≥3, dedup, drop stopwords. */
export function tokenize(text: string): Set<string> {
  const norm = normalize(text);
  const tokens = new Set<string>();
  for (const raw of norm.split(' ')) {
    if (raw.length < MIN_TOKEN_LENGTH) continue;
    if (STOPWORDS.has(raw)) continue;
    tokens.add(raw);
    // Expand with synonyms when a family keyword appears.
    const syns = SYNONYMS[raw];
    if (syns) for (const syn of syns) tokens.add(syn);
  }
  return tokens;
}

/** Tokenized signature of a material — name + brand + category words. */
function materialTokens(m: Material): Set<string> {
  const parts = [m.name, m.brand ?? '', m.category ?? '', m.type];
  return tokenize(parts.join(' '));
}

/** Count overlap between a material's tokens and the request tokens. */
function scoreMaterial(matTokens: Set<string>, requestTokens: Set<string>): number {
  let score = 0;
  for (const t of matTokens) {
    if (requestTokens.has(t)) score++;
  }
  return score;
}

/**
 * Curated coverage pool. When the request has weak keywords, we still want the
 * model to see at least one SKU from each common family so it can suggest a
 * sensible default. Pulled by category + simple selection criteria.
 *
 * Returns up to `limit` materials with diverse coverage.
 */
function coveragePool(catalog: Material[], limit: number): Material[] {
  const byCategory = new Map<string, Material[]>();
  for (const m of catalog) {
    const key = m.category ?? m.type;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(m);
  }
  // Round-robin pick across categories so coverage stays diverse.
  const pool: Material[] = [];
  const buckets = [...byCategory.values()];
  let i = 0;
  while (pool.length < limit && buckets.some((b) => b.length > 0)) {
    const bucket = buckets[i % buckets.length];
    if (bucket.length > 0) pool.push(bucket.shift()!);
    i++;
  }
  return pool;
}

/**
 * Returns the materials to include in the AI prompt, filtered by relevance to
 * the user's request. Falls back to a diverse coverage pool when the request
 * yields too few matches.
 */
export function selectRelevantMaterials(
  catalog: Material[],
  requestText: string,
  limit: number = MAX_RESULTS,
): Material[] {
  if (catalog.length <= limit) return catalog;

  const requestTokens = tokenize(requestText);

  // If the request is too thin (no real signal), just return a coverage pool.
  if (requestTokens.size < 3) {
    return coveragePool(catalog, limit);
  }

  // Score every material; keep those with at least one token match.
  const scored: { m: Material; score: number }[] = [];
  for (const m of catalog) {
    const matTokens = materialTokens(m);
    const score = scoreMaterial(matTokens, requestTokens);
    if (score > 0) scored.push({ m, score });
  }
  // Sort by score desc, then by name asc for stable ordering.
  scored.sort((a, b) => b.score - a.score || a.m.name.localeCompare(b.m.name));

  const matched = scored.slice(0, limit).map((s) => s.m);

  // If matches are weak (fewer than 10), top up with coverage so the model has
  // alternatives to fall back on without us slipping the entire catalog in.
  if (matched.length < 10) {
    const matchedIds = new Set(matched.map((m) => m.id));
    const remaining = limit - matched.length;
    const fillers = coveragePool(catalog, remaining + 20).filter(
      (m) => !matchedIds.has(m.id),
    );
    return [...matched, ...fillers.slice(0, remaining)];
  }
  return matched;
}
