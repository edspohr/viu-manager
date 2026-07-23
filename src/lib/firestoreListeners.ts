import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { useStore } from '../store/useStore';
import { PRICING_DOC_ID } from './firestoreSync';
import type { Order, Material, Customer, PricingConfig } from '../data/mockData';

// Once auth is resolved with a staff role, subscribe to the shared collections
// and mirror them into Zustand. Firestore is the source of truth — every
// snapshot overwrites the corresponding slice. Returns an unsubscribe fn.
export function subscribeToSharedData(): () => void {
  const store = useStore.getState();
  store.setSyncStatus('connecting');

  let materialsReady = false;
  let customersReady = false;
  let pricingReady = false;
  let ordersReady = false;

  const markReady = () => {
    if (materialsReady && customersReady && pricingReady && ordersReady) {
      // First full snapshot round-trip is complete — we're live unless the
      // browser is offline.
      const online = typeof navigator === 'undefined' ? true : navigator.onLine;
      useStore.getState().setSyncStatus(online ? 'live' : 'offline');
    }
  };

  const onErr = (label: string) => (err: unknown) => {
    console.error(`[listener] ${label}`, err);
    useStore.getState().setSyncStatus('error');
  };

  const unsubMaterials = onSnapshot(
    collection(db, 'materials'),
    (snap) => {
      const materials = snap.docs.map((d) => d.data() as Material);
      useStore.getState().replaceMaterials(materials);
      materialsReady = true;
      markReady();
    },
    onErr('materials'),
  );

  const unsubCustomers = onSnapshot(
    collection(db, 'customers'),
    (snap) => {
      const customers = snap.docs.map((d) => d.data() as Customer);
      useStore.getState().replaceCustomers(customers);
      customersReady = true;
      markReady();
    },
    onErr('customers'),
  );

  const unsubPricing = onSnapshot(
    doc(db, 'config', PRICING_DOC_ID),
    (snap) => {
      if (snap.exists()) {
        useStore.getState().replacePricingConfig(snap.data() as PricingConfig);
      }
      pricingReady = true;
      markReady();
    },
    onErr('pricing'),
  );

  const unsubOrders = onSnapshot(
    collection(db, 'orders'),
    (snap) => {
      const orders = snap.docs.map((d) => d.data() as Order);
      useStore.getState().replaceOrders(orders);
      ordersReady = true;
      markReady();
    },
    onErr('orders'),
  );

  return () => {
    unsubMaterials();
    unsubCustomers();
    unsubPricing();
    unsubOrders();
    useStore.getState().setSyncStatus('connecting');
  };
}
