import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Material, Customer } from '../data/mockData';
import { selectRelevantMaterials } from './materialSearch';

export interface ExtractedItem {
  description: string;
  materialId: string;
  materialName: string;
  width: number;
  height: number;
  quantity: number;
  finishing: string[];
  doubleSided: boolean;
  confidence: number;
}

export interface GeminiExtractionResult {
  campaignName: string;
  clientName: string;    // detected client name from the document
  items: ExtractedItem[];
  unknownMaterials: string[];  // material names AI couldn't match to catalog
  requiresInstallation: boolean;
  notes: string;
}

/** Fuzzy-match a detected name against existing customers. Returns match or null. */
export function findMatchingCustomer(detectedName: string, customers: Customer[]): Customer | null {
  if (!detectedName) return null;
  const norm = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
  const target = norm(detectedName);
  return customers.find((c) => {
    const cn = norm(c.name);
    return cn === target || cn.includes(target) || target.includes(cn);
  }) ?? null;
}

async function fileToGenerativePart(file: File) {
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return { inlineData: { data: base64, mimeType: file.type } };
}

/** Hard ceiling for a single Gemini call — beyond this, treat as a network hang. */
const GEMINI_TIMEOUT_MS = 90_000;

/** Race a promise against a timeout, rejecting if the deadline hits first. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} (>${Math.round(ms / 1000)}s)`)),
      ms,
    );
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Calls Gemini once. Returns the parsed extraction result.
 * Throws typed errors for parse failures, empty results, etc.
 */
async function callGemini(
  prompt: string,
  imageParts: { inlineData: { data: string; mimeType: string } }[],
  apiKey: string
): Promise<GeminiExtractionResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { maxOutputTokens: 8192 } as Record<string, unknown>,
  });

  const result = await withTimeout(
    model.generateContent([prompt, ...imageParts]),
    GEMINI_TIMEOUT_MS,
    'La IA no respondió a tiempo',
  );
  const text = result.response.text();
  const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();

  let parsed: GeminiExtractionResult;
  try {
    parsed = JSON.parse(clean) as GeminiExtractionResult;
  } catch {
    throw new ParseError(
      'La IA no pudo interpretar la solicitud. Intenta con más detalles.'
    );
  }

  if (!parsed.items || parsed.items.length === 0) {
    throw new ParseError(
      'No se detectaron ítems. Revisa el texto ingresado.'
    );
  }

  return parsed;
}

/** Distinguishes parse/validation errors from network errors for retry logic. */
class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

export async function extractOrderItems(
  emailText: string,
  files: File[],
  availableMaterials: Material[],
  spreadsheetText?: string
): Promise<GeminiExtractionResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('API key no configurada. Revisa el archivo .env');
  }

  // Truncate spreadsheet text so a huge xlsx (e.g. supplier price list) doesn't
  // blow up the prompt or trigger model timeouts. 60KB ≈ ~15K tokens.
  const SPREADSHEET_LIMIT = 60_000;
  let trimmedSpreadsheet = spreadsheetText ?? '';
  if (trimmedSpreadsheet.length > SPREADSHEET_LIMIT) {
    trimmedSpreadsheet =
      trimmedSpreadsheet.slice(0, SPREADSHEET_LIMIT) +
      `\n\n[... truncado: archivo demasiado grande, mostrados ${SPREADSHEET_LIMIT} caracteres de ${spreadsheetText!.length} ...]`;
  }
  const spreadsheetSection = trimmedSpreadsheet
    ? `\n\nSpreadsheet/CSV data extracted from uploaded file:\n${trimmedSpreadsheet}`
    : '';

  // Pre-filter the catalog by relevance: pick only the SKUs that match the
  // request keywords (plus a small diverse coverage pool as fallback). This
  // keeps the prompt small even with a 200+ SKU catalog. Materials the model
  // can't match will come back via `unknownMaterials` and the wizard's
  // MaterialsStep lets the user pick the right one manually.
  const relevant = selectRelevantMaterials(
    availableMaterials,
    `${emailText}\n${trimmedSpreadsheet}`,
  );
  const materialList = relevant
    .map((m) => {
      const shortName = m.name.length > 80 ? m.name.slice(0, 80) + '…' : m.name;
      return `  - id: "${m.id}", name: "${shortName}", type: ${m.type}`;
    })
    .join('\n');

  const prompt = `You are an expert estimator for VIU Print, a large-format printing company in Chile.
IMPORTANT: You MUST extract ALL items listed in the document without any limit. Do NOT truncate or skip any items. If there are 20 items, return all 20. Never stop early.
Extract ALL print items from the request. For each item return:
- description: short item name
- materialId: best match from this catalog (use "unknown" if nothing fits):
${materialList}
- materialName: the matched material name (or the original name if unknown)
- width: number in cm (0 if unknown)
- height: number in cm (0 if unknown)
- quantity: number (default 1)
- finishing: array of strings from: ["Corte Recto","Troquelado","Corte CNC","Tiro y Retiro","Corte Contorno","Ojetillos","Pie de Apoyo","Bolsillo Superior","Refuerzo","Instalación"]
- doubleSided: boolean
- confidence: 0.0–1.0 (your confidence this item is correctly extracted)

Also extract:
- campaignName: string (infer from context if not explicit)
- clientName: string (the client or company name if mentioned, empty string if not found)
- unknownMaterials: array of material name strings that couldn't be matched to the catalog above
- requiresInstallation: boolean
- notes: any important caveats

Request text:
${emailText}${spreadsheetSection}

Return ONLY valid JSON. No markdown. No explanation.
Schema: { "campaignName": string, "clientName": string, "items": ExtractedItem[], "unknownMaterials": string[], "requiresInstallation": boolean, "notes": string }`;

  // Only pass non-spreadsheet files as image parts (spreadsheets already converted to text)
  const imageParts = await Promise.all(files.map(fileToGenerativePart));

  try {
    return await callGemini(prompt, imageParts, apiKey);
  } catch (err: unknown) {
    // On ParseError (bad JSON or 0 items) — do NOT retry, surface the message
    if (err instanceof ParseError) {
      throw err;
    }
    console.error('Gemini call failed (1st attempt):', err);

    // Classify the error so we can show something more useful than "network error".
    const classified = classifyGeminiError(err);
    if (classified) throw classified;

    // Network / transient error → one automatic retry
    try {
      return await callGemini(prompt, imageParts, apiKey);
    } catch (retryErr: unknown) {
      if (retryErr instanceof ParseError) {
        throw retryErr;
      }
      console.error('Gemini call failed (retry):', retryErr);
      const classifiedRetry = classifyGeminiError(retryErr);
      if (classifiedRetry) throw classifiedRetry;
      throw new Error(
        'Error de red al contactar la IA. Intenta nuevamente en unos segundos.'
      );
    }
  }
}

/**
 * Maps SDK / fetch errors to user-friendly Spanish messages. Returns null if
 * the error looks transient (worth a retry) rather than something the user
 * should be told about immediately.
 */
function classifyGeminiError(err: unknown): Error | null {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  // Timeout from our own withTimeout — surface directly, no retry.
  if (lower.includes('no respondió a tiempo')) {
    return new Error(message);
  }

  // 4xx — typically permanent for this request, retrying won't help.
  if (lower.includes('api key not valid') || lower.includes('api_key_invalid')) {
    return new Error('API key inválida. Verifica VITE_GEMINI_API_KEY.');
  }
  if (lower.includes('permission_denied') || lower.includes('forbidden') || lower.includes('403')) {
    return new Error('La API key no tiene permisos. Revisa restricciones de referrer en Google Cloud Console.');
  }
  if (lower.includes('quota') || lower.includes('rate') || lower.includes('429')) {
    return new Error('Cuota de IA agotada o demasiadas solicitudes. Espera un minuto e intenta de nuevo.');
  }
  if (lower.includes('safety') || lower.includes('blocked')) {
    return new Error('La IA bloqueó la respuesta por política de seguridad. Revisa el contenido del archivo.');
  }
  if (lower.includes('400') || lower.includes('invalid')) {
    return new Error('La IA rechazó la solicitud (formato inválido). Revisa el archivo.');
  }

  // Anything else: treat as transient, allow retry.
  return null;
}
