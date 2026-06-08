// One-shot script: parse docs/DIPISA*.xls -> emit Material[] TS literal.
// Usage:  node scripts/parseDipisa.mjs > scripts/dipisa-materials.ts
//
// Output is hand-pasted into src/data/mockData.ts (between `// DIPISA-START`
// and `// DIPISA-END` markers).

import * as XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(
  __dirname,
  '..',
  'docs',
  'DIPISA - Lista de Precios ABRIL 2025 Comunicación Visual - IMPRENTA VIU-2.xls',
);

const wb = XLSX.read(fs.readFileSync(FILE), { type: 'buffer' });

// Sheet layouts:
//   - Most sheets:  CODIGO | MARCA | DESCRIPCIÓN |  |  | ANCHO | LARGO | $ MTS2 | NETO
//   - PAPELES has a couche/cartulina block with shifted header but same cols.
//   - DIGITAL PLIEGO: CODIGO | MARCA | DESCRIPCIÓN |  |  | GRAMAJE | FORMATO | $ RESMA | HOJAS
//   - 3M: 14 cols, NETO CLP at idx 13
//   - RIGIDOS - PLANCHAS: CODIGO | MARCA | DESCRIPCION |  | ANCHO | LARGO | VALOR PLANCHA | ...
//   - AVERY - FEDRIGONI: 17 cols, but the meaningful data uses the standard 9-col layout
//     plus extra "color availability" columns we ignore.

const out = [];
let seen = new Set();

function pushMaterial(m) {
  if (!m.id) return;
  if (seen.has(m.id)) {
    // Disambiguate duplicate SKUs (rare but happens) by appending width.
    m.id = `${m.id}-${m.width ?? m.sheetWidth ?? ''}`;
    if (seen.has(m.id)) return;
  }
  seen.add(m.id);
  out.push(m);
}

function clean(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function num(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[^\d.,-]/g, '').replace(/,/g, '.');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function slug(v) {
  return clean(v).replace(/\s+/g, ' ');
}

// Headers we'd recognise: anything containing both CODIGO and DESCRIP
function isHeaderRow(row) {
  const joined = row.map(clean).join('|').toUpperCase();
  return joined.includes('CODIGO') && joined.includes('DESCRIP');
}

function processFlexibleSheet(sheetName, ws, type) {
  // Standard 9-col layout (with possible trailing extras for AVERY/FEDRIGONI).
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  let lastDescription = '';
  for (const row of rows) {
    if (!Array.isArray(row) || row.length === 0) continue;
    if (isHeaderRow(row)) {
      lastDescription = '';
      continue;
    }
    const code = clean(row[0]);
    const brand = clean(row[1]);
    const desc = clean(row[2]);
    const width = num(row[5]); // ANCHO (m)
    const length = num(row[6]); // LARGO (m)
    const pricePerM2 = num(row[7]); // $ MTS2
    const net = num(row[8]); // NETO

    if (desc) lastDescription = desc;
    if (!code) continue;
    if (width === 0 && length === 0) continue;

    // unitMode:  per_m2 if $ MTS2 present, else per_roll.
    const unitMode = pricePerM2 > 0 ? 'per_m2' : 'per_roll';
    const supplier1Price = pricePerM2 > 0 ? Math.round(pricePerM2) : Math.round(net);

    pushMaterial({
      id: code,
      name: `${brand ? brand + ' — ' : ''}${lastDescription || code}`.slice(0, 200),
      type,
      stock: 0,
      unit: 'm',
      supplier1Price,
      supplier2Price: 0,
      supplier3Price: 0,
      activeSupplier: 1,
      unitMode,
      rollWidth: width || undefined,
      rollLength: length || undefined,
      brand: brand || undefined,
      supplierCode: code,
      category: sheetName,
    });
  }
}

function process3MSheet(ws) {
  // 14 cols. CODIGO=0, DURACION=2, TIPO=3, SUBMARCA=4, COLOR=5, DESCRIPCIÓN=6,
  // ANCHO=9, LARGO=10, $MTS2 USD=11, NETO USD=12, NETO CLP=13.
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  for (const row of rows) {
    if (!Array.isArray(row) || row.length === 0) continue;
    if (isHeaderRow(row)) continue;
    const code = clean(row[0]);
    if (!code || code === 'SKU') continue;
    const tipo = clean(row[3]);
    const submarca = clean(row[4]);
    const color = clean(row[5]);
    const desc = clean(row[6]);
    const width = num(row[9]);
    const length = num(row[10]);
    const netClp = num(row[13]);
    if (netClp === 0 || (width === 0 && length === 0)) continue;
    const area = width && length ? width * length : 0;
    const pricePerM2 = area > 0 ? Math.round(netClp / area) : Math.round(netClp);
    pushMaterial({
      id: code,
      name: `3M ${submarca} ${tipo} ${color} ${desc}`.replace(/\s+/g, ' ').trim().slice(0, 200),
      type: 'Flexible',
      stock: 0,
      unit: 'm',
      supplier1Price: pricePerM2,
      supplier2Price: 0,
      supplier3Price: 0,
      activeSupplier: 1,
      unitMode: 'per_m2',
      rollWidth: width || undefined,
      rollLength: length || undefined,
      brand: '3M',
      supplierCode: code,
      category: '3M',
    });
  }
}

function processRigidsSheet(ws) {
  // 10 cols. Two layouts:
  //  (a) CODIGO|MARCA|DESCRIPCIÓN| |  |ANCHO|LARGO|$ MTS2|NETO     (cinta doble contacto row)
  //  (b) CODIGO|MARCA|DESCRIPCION| |ANCHO|LARGO|VALOR PLANCHA|PLANCHAS EN PAQ|PRECIO PAQ|VALOR PALLET
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  let layout = null; // 'flex' | 'rigid'
  let lastDescription = '';
  for (const row of rows) {
    if (!Array.isArray(row) || row.length === 0) continue;
    const joined = row.map(clean).join('|').toUpperCase();
    if (joined.includes('CODIGO') && joined.includes('DESCRIP')) {
      if (joined.includes('VALOR PLANCHA')) layout = 'rigid';
      else layout = 'flex';
      lastDescription = '';
      continue;
    }
    if (!layout) continue;
    const code = clean(row[0]);
    const brand = clean(row[1]);
    const desc = layout === 'rigid' ? clean(row[2]) : clean(row[2]);
    if (desc) lastDescription = desc;
    if (!code) continue;

    if (layout === 'flex') {
      const width = num(row[6]);
      const length = num(row[7]);
      const pricePerM2 = num(row[8]);
      const net = num(row[9]);
      if (width === 0 && length === 0) continue;
      const unitMode = pricePerM2 > 0 ? 'per_m2' : 'per_roll';
      const supplier1Price = pricePerM2 > 0 ? Math.round(pricePerM2) : Math.round(net);
      pushMaterial({
        id: code,
        name: `${brand ? brand + ' — ' : ''}${lastDescription || code}`.slice(0, 200),
        type: 'Flexible',
        stock: 0,
        unit: 'm',
        supplier1Price,
        supplier2Price: 0,
        supplier3Price: 0,
        activeSupplier: 1,
        unitMode,
        rollWidth: width || undefined,
        rollLength: length || undefined,
        brand: brand || undefined,
        supplierCode: code,
        category: 'RIGIDOS - PLANCHAS',
      });
    } else {
      // rigid plancha
      const widthCm = num(row[4]); // ANCHO (cm)
      const lengthCm = num(row[5]); // LARGO (cm)
      const valorPlancha = num(row[6]);
      if (valorPlancha === 0 || widthCm === 0 || lengthCm === 0) continue;
      pushMaterial({
        id: code,
        name: `${brand ? brand + ' — ' : ''}${lastDescription || code}`.slice(0, 200),
        type: 'Rígido',
        stock: 0,
        unit: 'planchas',
        supplier1Price: Math.round(valorPlancha),
        supplier2Price: 0,
        supplier3Price: 0,
        activeSupplier: 1,
        unitMode: 'per_plancha',
        sheetWidth: widthCm,
        sheetHeight: lengthCm,
        minPrice: 1500,
        brand: brand || undefined,
        supplierCode: code,
        category: 'RIGIDOS - PLANCHAS',
      });
    }
  }
}

function processDigitalPliego(ws) {
  // GRAMAJE/FORMATO/$ RESMA/HOJAS — not used for area-based quoting.
  // We model these as per_roll with rollWidth=1, rollLength=1 and price = $ RESMA,
  // so quote engine treats them as "fixed-price per resma" by computing $/m² = price.
  // Acceptable since user can switch material type later.
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  let lastDescription = '';
  for (const row of rows) {
    if (!Array.isArray(row) || row.length === 0) continue;
    if (isHeaderRow(row)) {
      lastDescription = '';
      continue;
    }
    const code = clean(row[0]);
    const brand = clean(row[1]);
    const desc = clean(row[2]);
    const gramaje = clean(row[5]);
    const formato = clean(row[6]);
    const priceResma = num(row[7]);
    if (desc) lastDescription = desc;
    if (!code || priceResma === 0) continue;
    pushMaterial({
      id: code,
      name: `${brand ? brand + ' — ' : ''}${lastDescription || code} ${gramaje}g ${formato}`
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200),
      type: 'Flexible',
      stock: 0,
      unit: 'resma',
      supplier1Price: Math.round(priceResma),
      supplier2Price: 0,
      supplier3Price: 0,
      activeSupplier: 1,
      unitMode: 'per_roll',
      rollWidth: 1,
      rollLength: 1,
      brand: brand || undefined,
      supplierCode: code,
      category: 'DIGITAL PLIEGO',
    });
  }
}

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  if (sheetName === '3M') process3MSheet(ws);
  else if (sheetName === 'RIGIDOS - PLANCHAS') processRigidsSheet(ws);
  else if (sheetName === 'DIGITAL PLIEGO') processDigitalPliego(ws);
  else processFlexibleSheet(sheetName, ws, 'Flexible');
}

console.error(`Parsed ${out.length} materials`);

// Emit as TS literal — minimal escaping for ASCII-safe names.
function ts(value) {
  if (value === undefined) return 'undefined';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const safe = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${safe}"`;
  }
  return JSON.stringify(value);
}

const lines = [
  '// AUTO-GENERATED by scripts/parseDipisa.mjs — do not edit by hand.',
  "import type { Material } from './mockData';",
  '',
  'export const dipisaMaterials: Material[] = [',
];
for (const m of out) {
  const parts = [];
  for (const k of Object.keys(m)) {
    if (m[k] === undefined) continue;
    parts.push(`${k}: ${ts(m[k])}`);
  }
  lines.push(`  { ${parts.join(', ')} },`);
}
lines.push('];');
process.stdout.write(lines.join('\n') + '\n');
