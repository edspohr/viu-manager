import * as XLSX from 'xlsx';

/**
 * Converts an A1 column letter sequence to a 1-based column index.
 * "A" → 1, "Z" → 26, "AA" → 27, "XFD" → 16384.
 */
function colLetterToNumber(letters: string): number {
  let n = 0;
  for (const ch of letters) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n;
}

/** Convert a 1-based column index back to A1 letters. */
function colNumberToLetter(n: number): string {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Computes a tight bounding box of the actual non-empty cells in a sheet and
 * overwrites its `!ref` accordingly. Some Excel files declare huge phantom
 * ranges like `A3:XFD1048576` (16384 cols × 1M rows), which cause
 * `sheet_to_csv` to walk billions of empty cells and freeze the browser.
 *
 * Mutates the sheet in place. Safe to call on already-tight sheets.
 */
function tightenSheetRange(sheet: XLSX.WorkSheet): void {
  let minRow = Infinity;
  let minCol = Infinity;
  let maxRow = 0;
  let maxCol = 0;
  for (const key of Object.keys(sheet)) {
    if (key.startsWith('!')) continue;
    const match = key.match(/^([A-Z]+)(\d+)$/);
    if (!match) continue;
    const col = colLetterToNumber(match[1]);
    const row = parseInt(match[2], 10);
    if (row < minRow) minRow = row;
    if (row > maxRow) maxRow = row;
    if (col < minCol) minCol = col;
    if (col > maxCol) maxCol = col;
  }
  if (maxRow === 0) return; // empty sheet — leave !ref alone
  sheet['!ref'] =
    colNumberToLetter(minCol) + minRow + ':' + colNumberToLetter(maxCol) + maxRow;
}

/**
 * Reads an Excel (.xlsx/.xls) or CSV file and returns a text representation
 * suitable for passing to the Gemini prompt.
 *
 * Defensive against malformed sheets: tightens any phantom `!ref` range to
 * the actual data bounds before converting, and caps total output so a
 * pathological file can't blow up the prompt.
 */
export async function excelToText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const lines: string[] = [`[Archivo: ${file.name}]`];
  const HARD_CAP = 200_000; // chars, ~50k tokens — well below the prompt budget
  let totalLen = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    tightenSheetRange(sheet);
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    const trimmed = csv.trim();
    if (!trimmed) continue;
    const remaining = HARD_CAP - totalLen;
    if (remaining <= 0) {
      lines.push(`\n[... resto omitido: archivo demasiado grande ...]`);
      break;
    }
    const chunk = trimmed.length > remaining
      ? trimmed.slice(0, remaining) + '\n[... hoja truncada ...]'
      : trimmed;
    lines.push(`\n--- Hoja: ${sheetName} ---`);
    lines.push(chunk);
    totalLen += chunk.length + sheetName.length + 20;
  }

  return lines.join('\n');
}

export function isSpreadsheetFile(file: File): boolean {
  const ext = file.name.toLowerCase();
  return (
    ext.endsWith('.xlsx') ||
    ext.endsWith('.xls') ||
    ext.endsWith('.csv') ||
    file.type === 'text/csv' ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel'
  );
}
