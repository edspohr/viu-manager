// pdfjs-dist is ~600 KB gzip + a 2 MB worker. We load it dynamically on first
// use so the main bundle stays small and users who never upload a PDF never
// pay the cost.
let pdfjsModulePromise: Promise<typeof import('pdfjs-dist')> | null = null;
async function getPdfjs() {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = (async () => {
      const [pdfjs, workerUrlModule] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.mjs?url'),
      ]);
      // The ?url import default-exports the bundled worker URL — Vite emits
      // the worker file as a separate asset, no CDN involved.
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrlModule.default;
      return pdfjs;
    })();
  }
  return pdfjsModulePromise;
}

/**
 * Extracts text from a PDF file in the browser. Returns an empty string when
 * the PDF is scanned (image-only) so the caller can fall back to OCR via the
 * AI flow.
 */
export async function pdfToText(file: File): Promise<string> {
  const pdfjs = await getPdfjs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const parts: string[] = [`[Archivo: ${file.name}]`];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) {
      parts.push(`\n--- Página ${pageNum} ---\n${pageText}`);
    }
  }
  const total = parts.join('\n');
  // If we got less than 100 chars of real text, treat as scanned and signal
  // the caller to fall back (return only the file marker, not '' so callers
  // can still see "we tried this file").
  const realChars = total.replace(/[[\]\s\-\n]/g, '').length;
  if (realChars < 100) return '';
  return total;
}

export function isPdfFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
}
