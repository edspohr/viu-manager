import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Material, Customer } from '../data/mockData';

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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent([prompt, ...imageParts]);
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

  const materialList = availableMaterials
    .map((m) => `  - id: "${m.id}", name: "${m.name}", type: ${m.type}`)
    .join('\n');

  const spreadsheetSection = spreadsheetText
    ? `\n\nSpreadsheet/CSV data extracted from uploaded file:\n${spreadsheetText}`
    : '';

  const prompt = `You are an expert estimator for VIU Print, a large-format printing company in Chile.
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

    // Network / transient error → one automatic retry
    try {
      return await callGemini(prompt, imageParts, apiKey);
    } catch (retryErr: unknown) {
      if (retryErr instanceof ParseError) {
        throw retryErr;
      }
      throw new Error(
        'Error de red al contactar la IA. Intenta nuevamente en unos segundos.'
      );
    }
  }
}
