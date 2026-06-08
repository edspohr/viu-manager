import * as XLSX from 'xlsx';
import type { Customer } from '../data/mockData';

export interface ImportedCustomer {
  name: string;
  rut: string;
}

const STOPWORDS = new Set(['DE', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'DEL', 'A']);

/** Build a 3-letter ASCII-uppercase code from a customer name. */
export function deriveClientCode(name: string, existing: Set<string> = new Set()): string {
  const ascii = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .trim();
  const words = ascii.split(/\s+/).filter((w) => w && !STOPWORDS.has(w));
  const tokens = words.length > 0 ? words : ascii.split(/\s+/).filter(Boolean);

  // Strategy: first letter of each of the first 3 words; if fewer, pad from first word.
  const candidates: string[] = [];
  const first = (tokens[0] ?? 'XXX').padEnd(3, 'X');
  if (tokens.length >= 3) {
    candidates.push(tokens[0][0] + tokens[1][0] + tokens[2][0]);
  }
  if (tokens.length >= 2) {
    candidates.push(tokens[0][0] + tokens[1].slice(0, 2));
    candidates.push(tokens[0].slice(0, 2) + tokens[1][0]);
  }
  candidates.push(first.slice(0, 3));
  // Try every 3-char window of the joined ASCII as a last resort
  const joined = tokens.join('');
  for (let i = 0; i + 3 <= joined.length; i++) candidates.push(joined.slice(i, i + 3));

  for (const c of candidates) {
    if (c.length === 3 && !existing.has(c)) return c;
  }
  // Numeric suffix fallback
  for (let n = 1; n < 1000; n++) {
    const c = (first.slice(0, 2) + n).slice(-3);
    if (!existing.has(c)) return c;
  }
  return first.slice(0, 3);
}

function normaliseRut(raw: string): string {
  return raw.replace(/\s+/g, '').replace(/-+/g, '-').toUpperCase();
}

/** Parse an xlsx/xls file expecting columns containing "cliente" and "rut". */
export async function parseCustomersXlsx(file: File): Promise<ImportedCustomer[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const results: ImportedCustomer[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length === 0) continue;

    // Find header row (first row whose normalized cells include both keywords).
    let headerIdx = -1;
    let nameCol = -1;
    let rutCol = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const cells = rows[i].map((c) => String(c ?? '').trim().toLowerCase());
      const nIdx = cells.findIndex((c) => c.includes('cliente') || c === 'nombre');
      const rIdx = cells.findIndex((c) => c.includes('rut'));
      if (nIdx !== -1 && rIdx !== -1) {
        headerIdx = i;
        nameCol = nIdx;
        rutCol = rIdx;
        break;
      }
    }
    if (headerIdx === -1) continue;

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const name = String(row[nameCol] ?? '').trim();
      const rut = String(row[rutCol] ?? '').trim();
      if (!name || !rut) continue;
      results.push({ name, rut: normaliseRut(rut) });
    }
  }

  return results;
}

export interface MergeReport {
  added: number;
  updated: number;
  skipped: number;
}

/** Merge imported customers into the existing list, matched by normalised RUT. */
export function mergeCustomers(
  existing: Customer[],
  imported: ImportedCustomer[],
  options: {
    onAdd: (c: Customer) => void;
    onUpdate: (c: Customer) => void;
  },
): MergeReport {
  const report: MergeReport = { added: 0, updated: 0, skipped: 0 };
  const usedCodes = new Set(existing.map((c) => c.clientCode).filter(Boolean));
  const byRut = new Map(existing.map((c) => [normaliseRut(c.rut), c]));

  for (const row of imported) {
    if (!row.name || !row.rut) {
      report.skipped++;
      continue;
    }
    const match = byRut.get(row.rut);
    if (match) {
      if (match.name !== row.name) {
        options.onUpdate({ ...match, name: row.name });
        report.updated++;
      } else {
        report.skipped++;
      }
    } else {
      const clientCode = deriveClientCode(row.name, usedCodes);
      usedCodes.add(clientCode);
      const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      options.onAdd({
        id,
        name: row.name,
        type: 'Recurrente',
        contact: '',
        debt: 0,
        rut: row.rut,
        projectManager: '',
        address: '',
        segment: 'B',
        clientCode,
        initialCorrelative: 1,
        orderCount: 0,
      });
      report.added++;
    }
  }
  return report;
}
