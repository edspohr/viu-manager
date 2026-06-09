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
 * Models we'll try in order. 2.5-flash is preferred but during peak hours it
 * returns 503 "high demand". 2.0-flash and 1.5-flash are kept as fallbacks so
 * a single overloaded model doesn't break the flow.
 */
const MODEL_CHAIN = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

/** True if an error from the SDK looks like an overload / transient backend issue. */
function isTransientGeminiError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('service unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('unavailable') ||
    msg.includes('500') ||
    msg.includes('internal') ||
    msg.includes('failed to fetch') ||
    msg.includes('network')
  );
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Calls Gemini once on a specific model. Returns the parsed extraction result.
 * Throws typed errors for parse failures, empty results, etc.
 */
async function callGemini(
  prompt: string,
  imageParts: { inlineData: { data: string; mimeType: string } }[],
  apiKey: string,
  modelName: string,
): Promise<GeminiExtractionResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
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

/**
 * Calls Gemini with automatic backoff retry and model fallback.
 *
 * For each model in MODEL_CHAIN, retries on transient errors (503/500/network)
 * with exponential backoff (1s, 2s). On a permanent error or a successful
 * parse, returns / re-throws immediately. If all models exhaust their retries,
 * the last error bubbles up.
 */
async function callGeminiWithFallback(
  prompt: string,
  imageParts: { inlineData: { data: string; mimeType: string } }[],
  apiKey: string,
): Promise<GeminiExtractionResult> {
  let lastErr: unknown = null;
  for (let modelIdx = 0; modelIdx < MODEL_CHAIN.length; modelIdx++) {
    const modelName = MODEL_CHAIN[modelIdx];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callGemini(prompt, imageParts, apiKey, modelName);
      } catch (err) {
        // ParseError = model worked but didn't return valid data → don't retry / fallback
        if (err instanceof ParseError) throw err;
        lastErr = err;
        if (!isTransientGeminiError(err)) {
          // Not a transient error → don't waste attempts on other models
          throw err;
        }
        console.warn(
          `Gemini ${modelName} attempt ${attempt + 1} transient error, ` +
            `${attempt === 0 ? 'retrying' : 'falling back to next model'}…`,
          err,
        );
        if (attempt === 0) await sleep(1000 * (modelIdx + 1)); // 1s, 2s, 3s backoff
      }
    }
  }
  throw lastErr ?? new Error('La IA no pudo responder.');
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
    return await callGeminiWithFallback(prompt, imageParts, apiKey);
  } catch (err: unknown) {
    if (err instanceof ParseError) throw err;
    console.error('Gemini call failed after all retries/fallbacks:', err);
    const classified = classifyGeminiError(err);
    if (classified) throw classified;
    throw new Error(
      'Error de red al contactar la IA. Intenta nuevamente en unos segundos.'
    );
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
  // 5xx after all retries/fallbacks — Google's servers are having a bad day.
  if (lower.includes('503') || lower.includes('high demand') || lower.includes('overloaded') || lower.includes('service unavailable')) {
    return new Error('Los servidores de IA están saturados (Google). Espera 1-2 minutos e intenta de nuevo.');
  }

  // Anything else: treat as transient, allow retry.
  return null;
}

/**
 * Lightweight Gemini call to fill missing metadata fields (clientName,
 * campaignName, eventName, deliveryDate, requiresInstallation) when the
 * deterministic structured extractor parsed the items but couldn't find
 * everything in the header. Uses the same retry/fallback chain.
 *
 * Returns a partial metadata object; never throws — callers should treat a
 * failure as "no extra metadata, continue without it".
 */
export interface MetadataCompletion {
  clientName?: string;
  campaignName?: string;
  eventName?: string;
  deliveryDate?: string;
  requiresInstallation?: boolean;
  notes?: string;
}

export async function completeMetadata(
  snippet: string,
  missing: string[],
): Promise<MetadataCompletion> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey || missing.length === 0 || !snippet.trim()) return {};

  // Cap the snippet at 2 KB — header info is always at the top of the doc.
  const text = snippet.length > 2000 ? snippet.slice(0, 2000) : snippet;

  const prompt = `Extract these missing fields from the text below. Return ONLY valid JSON with the requested keys (and nothing else). Empty string when not found. For dates use ISO yyyy-mm-dd.
Missing fields: ${missing.join(', ')}
Text:
${text}
JSON:`;

  try {
    const result = await callGeminiRaw(prompt, [], apiKey);
    return result;
  } catch (err) {
    console.warn('completeMetadata failed, continuing without it:', err);
    return {};
  }
}

/**
 * Generic Gemini call that returns parsed JSON (no schema validation).
 * Used by completeMetadata; doesn't throw ParseError because metadata is
 * non-essential — caller decides what to do with a {} response.
 */
async function callGeminiRaw(
  prompt: string,
  imageParts: { inlineData: { data: string; mimeType: string } }[],
  apiKey: string,
): Promise<MetadataCompletion> {
  let lastErr: unknown = null;
  for (let modelIdx = 0; modelIdx < MODEL_CHAIN.length; modelIdx++) {
    const modelName = MODEL_CHAIN[modelIdx];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { maxOutputTokens: 512 } as Record<string, unknown>,
        });
        const result = await withTimeout(
          model.generateContent([prompt, ...imageParts]),
          30_000,
          'La IA no respondió a tiempo',
        );
        const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text) as MetadataCompletion;
      } catch (err) {
        lastErr = err;
        if (!isTransientGeminiError(err)) throw err;
        if (attempt === 0) await sleep(500 * (modelIdx + 1));
      }
    }
  }
  throw lastErr ?? new Error('metadata completion failed');
}
