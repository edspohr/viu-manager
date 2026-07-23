import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { db } from './firebase';
import type { Order, Material, Customer, PricingConfig } from '../data/mockData';

const RETRY_DELAY_MS = 800;

// One retry with a short backoff. Firestore's own SDK handles reconnect + retry
// for network blips, so this is just a belt-and-braces guard for transient
// permission/quota errors and any UX around them.
async function withRetry<T>(op: () => Promise<T>, label: string): Promise<T> {
  try {
    return await op();
  } catch (err) {
    console.warn(`[sync] ${label} failed, retrying`, err);
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    try {
      return await op();
    } catch (err2) {
      console.error(`[sync] ${label} failed after retry`, err2);
      toast.error('No se pudo guardar el cambio. Revisa tu conexión.');
      throw err2;
    }
  }
}

// ── Orders ──────────────────────────────────────────────────────────────────

export async function syncOrderToFirestore(order: Order): Promise<void> {
  await withRetry(
    () => setDoc(doc(db, 'orders', order.id), order, { merge: true }),
    `syncOrder ${order.id}`,
  );
}

export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  await withRetry(
    () => deleteDoc(doc(db, 'orders', orderId)),
    `deleteOrder ${orderId}`,
  );
}

export async function getOrderFromFirestore(orderId: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (!snap.exists()) return null;
  return snap.data() as Order;
}

// ── Materials ───────────────────────────────────────────────────────────────

export async function syncMaterialToFirestore(material: Material): Promise<void> {
  await withRetry(
    () => setDoc(doc(db, 'materials', material.id), material, { merge: true }),
    `syncMaterial ${material.id}`,
  );
}

export async function deleteMaterialFromFirestore(materialId: string): Promise<void> {
  await withRetry(
    () => deleteDoc(doc(db, 'materials', materialId)),
    `deleteMaterial ${materialId}`,
  );
}

// ── Customers ───────────────────────────────────────────────────────────────

export async function syncCustomerToFirestore(customer: Customer): Promise<void> {
  await withRetry(
    () => setDoc(doc(db, 'customers', customer.id), customer, { merge: true }),
    `syncCustomer ${customer.id}`,
  );
}

export async function deleteCustomerFromFirestore(customerId: string): Promise<void> {
  await withRetry(
    () => deleteDoc(doc(db, 'customers', customerId)),
    `deleteCustomer ${customerId}`,
  );
}

// ── Pricing config (singleton) ──────────────────────────────────────────────

export const PRICING_DOC_ID = 'pricing';

export async function syncPricingConfigToFirestore(config: PricingConfig): Promise<void> {
  await withRetry(
    () => setDoc(doc(db, 'config', PRICING_DOC_ID), config, { merge: true }),
    'syncPricingConfig',
  );
}

export async function getPricingConfigFromFirestore(): Promise<PricingConfig | null> {
  const snap = await getDoc(doc(db, 'config', PRICING_DOC_ID));
  if (!snap.exists()) return null;
  return snap.data() as PricingConfig;
}
