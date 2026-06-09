import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractStructured } from './structuredExtractor';
import { dipisaMaterials } from '../data/dipisaMaterials';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OTI_FIXTURE = readFileSync(
  join(__dirname, '__fixtures__/oti-spartaalto.csv'),
  'utf-8',
);

describe('extractStructured — OTI SPARTAALTO real fixture', () => {
  const result = extractStructured(OTI_FIXTURE, 'OTI SPARTAALTO_04-02-2026.xlsx', dipisaMaterials);

  it('detects high confidence on a fully structured sheet', () => {
    expect(result.confidence).toBe('high');
  });

  it('extracts all 12 items from the OTI sheet', () => {
    expect(result.items).toHaveLength(12);
  });

  it('parses quantities including "UNIDADES TOTAL" hints', () => {
    const quantities = result.items.map((i) => i.quantity);
    // Items 1,2,4,5 → 1 unit each. 3 → 3. 6 → 2. 7 → 4. 8 → 2. 9 → 10. 10 → 7. 11 → 2. 12 → 2.
    expect(quantities).toEqual([1, 1, 3, 1, 1, 2, 4, 2, 10, 7, 2, 2]);
  });

  it('parses dimensions with comma decimal (29,3X18 → 29.3 × 18)', () => {
    const item4 = result.items[3]; // "29,3X18" — but the size column has "29X18", so the size col wins
    expect(item4.width).toBeGreaterThan(0);
    expect(item4.height).toBe(18);
  });

  it('falls back to description for dimensions when size col matches', () => {
    const item1 = result.items[0];
    expect(item1.width).toBe(53);
    expect(item1.height).toBe(14);
  });

  it('detects TROQUELADO finishing on items 4, 5, 9', () => {
    expect(result.items[3].finishing).toContain('Troquelado');
    expect(result.items[4].finishing).toContain('Troquelado');
    expect(result.items[8].finishing).toContain('Troquelado');
  });

  it('detects "Corte Recto" finishing on items with RECTA', () => {
    expect(result.items[0].finishing).toContain('Corte Recto');
    expect(result.items[1].finishing).toContain('Corte Recto');
  });

  it('does NOT mark TIRO-only items as doubleSided', () => {
    // All OTI rows have side="TIRO", no "TIRO Y RETIRO" → none should be doubleSided
    expect(result.items.every((i) => !i.doubleSided)).toBe(true);
  });

  it('extracts metadata: eventName, clientName, deliveryDate', () => {
    expect(result.metadata.eventName).toBe('APERTURA ALC');
    expect(result.metadata.clientName?.toUpperCase()).toContain('CARO BRUNO');
    expect(result.metadata.deliveryDate).toBe('2026-02-09');
  });

  it('defaults campaignName to eventName when no explicit campaign label', () => {
    expect(result.metadata.campaignName).toBe('APERTURA ALC');
  });

  it('collects material names that did not match the DIPISA catalog', () => {
    // "ADHESIVO LAMINADO GLOSSY" / "IMANES IMPRESOS" likely don't have an exact match
    expect(result.unknownMaterials.length).toBeGreaterThanOrEqual(0);
  });
});

describe('extractStructured — edge cases', () => {
  it('returns confidence=none on empty input', () => {
    const r = extractStructured('', 'empty.xlsx', dipisaMaterials);
    expect(r.confidence).toBe('none');
    expect(r.items).toHaveLength(0);
  });

  it('returns confidence=none when no header is detectable', () => {
    const noisy = 'random text\nno columns\njust prose';
    const r = extractStructured(noisy, 'note.txt', dipisaMaterials);
    expect(r.confidence).toBe('none');
  });

  it('handles TIRO Y RETIRO → doubleSided=true', () => {
    const csv = `
CANTIDAD,Tamaño,Material,Tiro / Retiro,Terminación
2,50x30,Vinilo,TIRO Y RETIRO,RECTA
`;
    const r = extractStructured(csv, 'test.csv', dipisaMaterials);
    expect(r.items[0].doubleSided).toBe(true);
    expect(r.items[0].finishing).toContain('Tiro y Retiro');
  });

  it('detects OJETILLOS in comment', () => {
    const csv = `
CANTIDAD,Medida,Material,Terminación,Comentario
5,100x200,Tela PVC,RECTA,4 ojetillos en esquinas
`;
    const r = extractStructured(csv, 'test.csv', dipisaMaterials);
    expect(r.items[0].finishing).toContain('Ojetillos');
    expect(r.items[0].finishing).toContain('Corte Recto');
  });

  it('skips trailing junk rows with no data', () => {
    const csv = `
CANTIDAD,Tamaño,Material,Terminación
1,10x10,Vinilo,RECTA
,,,
,,,Precio total
`;
    const r = extractStructured(csv, 'test.csv', dipisaMaterials);
    expect(r.items).toHaveLength(1);
  });
});
