import type { Material } from '../data/mockData';
import type { ExtractedItem } from './geminiService';
import { normalize, tokenize } from './materialSearch';

/**
 * Deterministic regex-first extractor for structured quote sheets (OTI, briefs,
 * orden de trabajo). When a sheet has a recognisable header (CANTIDAD, Tamaño,
 * Material, Terminación) we can pull every item locally without calling the AI.
 *
 * Returns `confidence: 'high'` when we found a header AND at least one item
 * with dimensions+material+quantity. Otherwise the caller should fall back to
 * the AI flow.
 */

export interface StructuredMetadata {
  campaignName?: string;
  clientName?: string;
  eventName?: string;
  deliveryDate?: string; // ISO yyyy-mm-dd
  requiresInstallation?: boolean;
  notes?: string;
}

export interface StructuredResult {
  confidence: 'high' | 'medium' | 'none';
  items: ExtractedItem[];
  metadata: StructuredMetadata;
  missingFields: Array<keyof StructuredMetadata>;
  unknownMaterials: string[];
}

// ── Column header detection ─────────────────────────────────────────────────

type ColRole = 'quantity' | 'size' | 'material' | 'side' | 'finishing' | 'description' | 'comment';

const HEADER_PATTERNS: Array<[ColRole, RegExp]> = [
  ['quantity', /^(?:cantidad|cant|qty|cant\.|unidades)\b/i],
  ['size', /^(?:tama[ñn]o|medida|medidas|dimensi[oó]n|dimensiones|formato|size)\b/i],
  ['material', /^(?:material|sustrato|soporte|insumo)\b/i],
  ['side', /^(?:tiro\s*\/?\s*retiro|tiro|impresi[oó]n)\b/i],
  ['finishing', /^(?:terminaci[oó]n|terminacion|acabado|finishing|corte)\b/i],
  ['description', /^(?:nombre\s+del\s+archivo|descripci[oó]n|producto|item|nombre|art[ií]culo)\b/i],
  ['comment', /^(?:comentario|observacion|nota|notas|detalle)\b/i],
];

/** Splits a CSV-ish line into trimmed cells, respecting quoted commas. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; continue; }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

interface HeaderInfo {
  rowIndex: number;
  cols: Map<ColRole, number>;
}

function detectHeader(rows: string[][]): HeaderInfo | null {
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const row = rows[r];
    const cols = new Map<ColRole, number>();
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (!cell) continue;
      for (const [role, pat] of HEADER_PATTERNS) {
        if (cols.has(role)) continue;
        if (pat.test(cell)) {
          cols.set(role, c);
          break;
        }
      }
    }
    if (cols.size >= 3) {
      return { rowIndex: r, cols };
    }
  }
  return null;
}

// ── Row parsing ─────────────────────────────────────────────────────────────

/** Match the first w × h pattern in the text. Supports comma or dot decimals. */
const DIMENSION_RE = /(\d+(?:[,.]\d+)?)\s*[Xx×]\s*(\d+(?:[,.]\d+)?)/;
const QTY_FROM_DESC_RE = /(\d+)\s*UNIDADES?\b/i;

function parseDimension(text: string): { width: number; height: number } | null {
  const m = text.match(DIMENSION_RE);
  if (!m) return null;
  const w = parseFloat(m[1].replace(',', '.'));
  const h = parseFloat(m[2].replace(',', '.'));
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null;
  return { width: w, height: h };
}

function parseQuantity(rawCell: string, descCell: string): number {
  // Direct integer in the quantity column
  const direct = rawCell.replace(/[^\d]/g, '');
  if (direct) {
    const n = parseInt(direct, 10);
    if (n > 0) return n;
  }
  // "_3 UNIDADES" inside the description
  const m = descCell.match(QTY_FROM_DESC_RE);
  if (m) return parseInt(m[1], 10);
  return 1;
}

/**
 * Maps finishing cell text + optional comment to canonical finishing keys
 * from initialPricingConfig.finishingMultipliers / finishingAddons.
 */
function parseFinishing(finishingCell: string, commentCell: string): string[] {
  const text = `${finishingCell} ${commentCell}`.toUpperCase();
  const out: string[] = [];
  // Multipliers (cut types) — pick the first that matches, they're mutually exclusive
  if (/\bTROQUEL/.test(text)) out.push('Troquelado');
  else if (/\bC\.?\s*N\.?\s*C/.test(text)) out.push('Corte CNC');
  else if (/\bCONTORNO/.test(text)) out.push('Corte Contorno');
  else if (/\bRECTA?\b/.test(text) || /\bCORTE\s+RECTO/.test(text)) out.push('Corte Recto');
  // Add-ons (cumulative)
  if (/\bOJETILLO/.test(text)) out.push('Ojetillos');
  if (/\bPIE\s+DE\s+APOYO/.test(text)) out.push('Pie de Apoyo');
  if (/\bBOLSILLO/.test(text)) out.push('Bolsillo Superior');
  if (/\bREFUERZO/.test(text)) out.push('Refuerzo');
  if (/\bINSTALACI[OÓ]N/.test(text)) out.push('Instalación');
  return out;
}

function parseDoubleSided(sideCell: string): boolean {
  const t = sideCell.toUpperCase();
  return /\bRETIRO\b/.test(t) && /\bTIRO\b/.test(t);
}

// ── Material matching ──────────────────────────────────────────────────────

/**
 * Maps a material name from the sheet to a real materialId in the catalog
 * using token overlap (reuses tokenize() from materialSearch).
 * Returns 'unknown' when no decent match exists.
 */
function matchMaterial(rawName: string, catalog: Material[]): { id: string; name: string } {
  if (!rawName.trim()) return { id: 'unknown', name: rawName };
  const requestTokens = tokenize(rawName);
  if (requestTokens.size === 0) return { id: 'unknown', name: rawName };

  let bestScore = 0;
  let bestMat: Material | null = null;
  for (const m of catalog) {
    const matTokens = tokenize(`${m.name} ${m.brand ?? ''} ${m.category ?? ''}`);
    let score = 0;
    for (const t of requestTokens) if (matTokens.has(t)) score++;
    if (score > bestScore) {
      bestScore = score;
      bestMat = m;
    }
  }
  // Require at least 2 token overlap so we don't match on a single generic word
  if (bestMat && bestScore >= 2) {
    return { id: bestMat.id, name: bestMat.name };
  }
  return { id: 'unknown', name: rawName };
}

// ── Metadata extraction ────────────────────────────────────────────────────

/**
 * Metadata labels we recognise. Each maps a regex (run against individual
 * cells) to the target field. The value is taken from the *next non-empty
 * cell* in the same row, so labels and values that live in adjacent columns
 * are paired correctly (as happens in OTI: `... | Nombre del Evento: | APERTURA ALC | Fecha: | 04/02/2026 | ...`).
 */
const META_LABELS: Array<{ field: keyof StructuredMetadata; pattern: RegExp; isDate?: boolean }> = [
  { field: 'eventName', pattern: /(?:nombre\s+del\s+)?evento\b/i },
  { field: 'clientName', pattern: /^\s*(?:cliente|mandante|empresa)\b/i },
  { field: 'deliveryDate', pattern: /fecha\s+de\s+entrega\b/i, isDate: true },
];

function toIsoDate(raw: string): string {
  // Accept dd/mm/yyyy or dd-mm-yyyy (yy → 20yy)
  const m = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!m) return raw;
  const [, d, mo, yRaw] = m;
  const y = yRaw.length === 2 ? '20' + yRaw : yRaw;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function extractMetadata(rows: string[][], fileName: string, headerRowIdx: number): StructuredMetadata {
  const meta: StructuredMetadata = {};
  const scanRows = rows.slice(0, headerRowIdx > 0 ? headerRowIdx : 10);

  for (const row of scanRows) {
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (!cell) continue;
      for (const { field, pattern, isDate } of META_LABELS) {
        if (meta[field]) continue;
        if (!pattern.test(cell)) continue;
        // Look at the next non-empty cell in the same row
        let next = '';
        for (let n = c + 1; n < row.length; n++) {
          if (row[n] && row[n].trim()) { next = row[n].trim(); break; }
        }
        if (!next) continue;
        const value = isDate ? toIsoDate(next) : next.replace(/^[:\s]+/, '').trim();
        if (!value || value.length > 200) continue;
        // META_LABELS only references string fields, so the cast is safe.
        (meta as Record<string, string>)[field] = value;
      }
    }
  }

  // Installation hint anywhere in the header
  const headerJoined = scanRows.map((r) => r.join(' ')).join(' ');
  if (/instalaci[oó]n/i.test(headerJoined)) meta.requiresInstallation = true;

  // Campaign name defaults to event name, then file name
  if (!meta.campaignName) {
    if (meta.eventName) meta.campaignName = meta.eventName;
    else meta.campaignName = fileName.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim();
  }
  return meta;
}

// ── Main entry ──────────────────────────────────────────────────────────────

/**
 * Parses CSV-like text (the output of excelToText, a CSV upload, or any
 * tab/newline structured paste) into a StructuredResult.
 */
export function extractStructured(
  text: string,
  fileName: string,
  catalog: Material[],
): StructuredResult {
  if (!text || text.trim().length === 0) {
    return emptyResult();
  }
  const lines = text.split(/\r?\n/);
  const rows = lines.map(splitCsvLine);

  const header = detectHeader(rows);
  if (!header) {
    return emptyResult();
  }

  const items: ExtractedItem[] = [];
  const unknownMaterials: string[] = [];

  for (let r = header.rowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every((c) => !c)) continue;

    const get = (role: ColRole): string => {
      const idx = header.cols.get(role);
      return idx !== undefined ? (row[idx] ?? '') : '';
    };

    const qtyCell = get('quantity');
    const sizeCell = get('size');
    const matCell = get('material');
    const sideCell = get('side');
    const finCell = get('finishing');
    const descCell = get('description');
    const commentCell = get('comment');

    // Skip rows that look like trailing notes/legends (no material AND no size)
    if (!matCell && !sizeCell && !descCell) continue;

    // Dimensions: prefer the size column, fall back to the description
    let dim = parseDimension(sizeCell);
    if (!dim) dim = parseDimension(descCell);
    if (!dim) dim = { width: 0, height: 0 };

    const quantity = parseQuantity(qtyCell, descCell);

    // Material match
    const matched = matchMaterial(matCell, catalog);
    if (matched.id === 'unknown' && matCell.trim()) {
      if (!unknownMaterials.includes(matCell.trim())) {
        unknownMaterials.push(matCell.trim());
      }
    }

    const finishing = parseFinishing(finCell, commentCell);
    const doubleSided = parseDoubleSided(sideCell);
    // Tiro y retiro adds a "Tiro y Retiro" multiplier in the finishing array
    if (doubleSided && !finishing.includes('Tiro y Retiro')) {
      finishing.push('Tiro y Retiro');
    }

    items.push({
      description: descCell || matCell || `Item ${items.length + 1}`,
      materialId: matched.id,
      materialName: matched.name,
      width: dim.width,
      height: dim.height,
      quantity,
      finishing,
      doubleSided,
      confidence: matched.id === 'unknown' ? 0.6 : 0.9,
    });
  }

  // Filter items that have neither material nor dimensions (likely junk rows)
  const validItems = items.filter(
    (it) => (it.width > 0 && it.height > 0) || it.materialId !== 'unknown',
  );

  if (validItems.length === 0) {
    return emptyResult();
  }

  const metadata = extractMetadata(rows, fileName, header.rowIndex);

  const missingFields: Array<keyof StructuredMetadata> = [];
  if (!metadata.clientName) missingFields.push('clientName');
  if (!metadata.campaignName) missingFields.push('campaignName');
  if (!metadata.deliveryDate) missingFields.push('deliveryDate');

  // Confidence: high when header + ≥1 valid item with all key fields
  const strongItems = validItems.filter(
    (it) => it.width > 0 && it.height > 0 && it.quantity > 0 && it.materialId !== 'unknown',
  );
  const confidence: StructuredResult['confidence'] =
    header.cols.size >= 3 && strongItems.length > 0 ? 'high' : 'medium';

  return {
    confidence,
    items: validItems,
    metadata,
    missingFields,
    unknownMaterials,
  };
}

function emptyResult(): StructuredResult {
  return {
    confidence: 'none',
    items: [],
    metadata: {},
    missingFields: [],
    unknownMaterials: [],
  };
}

// Re-export for convenience in tests
export { normalize };
