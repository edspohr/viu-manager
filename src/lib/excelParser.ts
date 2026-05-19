import * as XLSX from 'xlsx';

/**
 * Reads an Excel (.xlsx/.xls) or CSV file and returns a text representation
 * suitable for passing to the Gemini prompt.
 */
export async function excelToText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const lines: string[] = [`[Archivo: ${file.name}]`];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (csv.trim()) {
      lines.push(`\n--- Hoja: ${sheetName} ---`);
      lines.push(csv);
    }
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
