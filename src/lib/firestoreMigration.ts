import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { PRICING_DOC_ID } from './firestoreSync';
import {
  customers as seedCustomers,
  initialPricingConfig,
  type Customer,
  type Material,
  type Order,
  type PricingConfig,
} from '../data/mockData';
import { dipisaMaterials } from '../data/dipisaMaterials';

const MIGRATION_FLAG_KEY = 'viu-firestore-migrated:v1';

// The seed catalogues that ship with the app. If a local record has one of
// these ids AND has not been modified by the user, it should never be pushed
// to Firestore. Legitimate local edits (renamed, price changes) still upload.
const SEED_CUSTOMER_IDS = new Set(seedCustomers.map((c) => c.id));
const SEED_MATERIAL_IDS = new Set(dipisaMaterials.map((m) => m.id));
const SEED_CUSTOMER_BY_ID = new Map(seedCustomers.map((c) => [c.id, c]));
const SEED_MATERIAL_BY_ID = new Map(dipisaMaterials.map((m) => [m.id, m]));

// Shallow equality — the seed shape is flat except for nothing nested we need
// to compare. Different reference is fine as long as the field values match.
function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function materialKey(m: Material): string {
  const code = m.supplierCode?.trim();
  return code && code.length > 0 ? `sku:${code}` : `name:${normalizeName(m.name)}`;
}

function customerKey(c: Customer): string {
  const rut = c.rut?.trim();
  return rut && rut.length > 0 ? `rut:${rut}` : `name:${normalizeName(c.name)}`;
}

export function hasRunMigration(): boolean {
  try {
    return localStorage.getItem(MIGRATION_FLAG_KEY) === '1';
  } catch {
    return true;
  }
}

function markMigrationDone(): void {
  try {
    localStorage.setItem(MIGRATION_FLAG_KEY, '1');
  } catch {
    /* storage disabled — best effort */
  }
}

interface LocalCache {
  materials: Material[];
  customers: Customer[];
  orders: Order[];
  pricingConfig: PricingConfig;
}

interface MigrationReport {
  materialsUploaded: number;
  materialsSkippedAsSeed: number;
  materialsSkippedAsDuplicate: number;
  customersUploaded: number;
  customersSkippedAsSeed: number;
  customersSkippedAsDuplicate: number;
  ordersUploaded: number;
  pricingWritten: boolean;
}

// Called once per device on first authenticated load. Uploads whatever this
// browser has that Firestore doesn't yet — with two rules:
//   1. Untouched seed records are NEVER uploaded (would pollute prod).
//   2. First writer wins per merge key (SKU / RUT). Later users' catalogs get
//      merged into a superset without overwriting each other.
export async function runFirstLoginMigration(cache: LocalCache): Promise<MigrationReport> {
  const report: MigrationReport = {
    materialsUploaded: 0,
    materialsSkippedAsSeed: 0,
    materialsSkippedAsDuplicate: 0,
    customersUploaded: 0,
    customersSkippedAsSeed: 0,
    customersSkippedAsDuplicate: 0,
    ordersUploaded: 0,
    pricingWritten: false,
  };

  // ── Materials ─────────────────────────────────────────────────────────────
  const materialsSnap = await getDocs(collection(db, 'materials'));
  const existingMaterialKeys = new Set<string>();
  for (const d of materialsSnap.docs) {
    existingMaterialKeys.add(materialKey(d.data() as Material));
  }

  for (const m of cache.materials) {
    // Unmodified seed → skip. Modified seed (user edited it) → still upload.
    if (SEED_MATERIAL_IDS.has(m.id)) {
      const seed = SEED_MATERIAL_BY_ID.get(m.id);
      if (seed && shallowEqual(m as unknown as Record<string, unknown>, seed as unknown as Record<string, unknown>)) {
        report.materialsSkippedAsSeed++;
        continue;
      }
    }
    const key = materialKey(m);
    if (existingMaterialKeys.has(key)) {
      report.materialsSkippedAsDuplicate++;
      continue;
    }
    await setDoc(doc(db, 'materials', m.id), m, { merge: true });
    existingMaterialKeys.add(key);
    report.materialsUploaded++;
  }

  // ── Customers ─────────────────────────────────────────────────────────────
  const customersSnap = await getDocs(collection(db, 'customers'));
  const existingCustomerKeys = new Set<string>();
  for (const d of customersSnap.docs) {
    existingCustomerKeys.add(customerKey(d.data() as Customer));
  }

  for (const c of cache.customers) {
    if (SEED_CUSTOMER_IDS.has(c.id)) {
      const seed = SEED_CUSTOMER_BY_ID.get(c.id);
      if (seed && shallowEqual(c as unknown as Record<string, unknown>, seed as unknown as Record<string, unknown>)) {
        report.customersSkippedAsSeed++;
        continue;
      }
    }
    const key = customerKey(c);
    if (existingCustomerKeys.has(key)) {
      report.customersSkippedAsDuplicate++;
      continue;
    }
    await setDoc(doc(db, 'customers', c.id), c, { merge: true });
    existingCustomerKeys.add(key);
    report.customersUploaded++;
  }

  // ── Pricing config ────────────────────────────────────────────────────────
  const pricingRef = doc(db, 'config', PRICING_DOC_ID);
  const pricingSnap = await getDoc(pricingRef);
  if (!pricingSnap.exists()) {
    // Only upload if the local config differs from the shipped default —
    // otherwise we'd pollute prod with empty defaults.
    const isUnmodifiedDefault = shallowEqual(
      cache.pricingConfig as unknown as Record<string, unknown>,
      initialPricingConfig as unknown as Record<string, unknown>,
    );
    if (!isUnmodifiedDefault) {
      await setDoc(pricingRef, cache.pricingConfig, { merge: true });
      report.pricingWritten = true;
    }
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  // Upload any local orders Firestore doesn't have yet. Orders can't be "seed"
  // because initialOrders is empty.
  const ordersSnap = await getDocs(collection(db, 'orders'));
  const existingOrderIds = new Set(ordersSnap.docs.map((d) => d.id));
  for (const o of cache.orders) {
    if (existingOrderIds.has(o.id)) continue;
    await setDoc(doc(db, 'orders', o.id), o, { merge: true });
    report.ordersUploaded++;
  }

  markMigrationDone();
  return report;
}
