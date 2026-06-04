import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Order } from '../data/mockData';

export async function syncOrderToFirestore(order: Order): Promise<void> {
  await setDoc(doc(db, 'orders', order.id), order, { merge: true });
}

export async function getOrderFromFirestore(orderId: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (!snap.exists()) return null;
  return snap.data() as Order;
}
