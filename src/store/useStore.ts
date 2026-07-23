import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type Order,
  type Customer,
  type Material,
  type PricingConfig,
  initialPricingConfig,
} from '../data/mockData';
import {
  syncOrderToFirestore,
  deleteOrderFromFirestore,
  syncMaterialToFirestore,
  deleteMaterialFromFirestore,
  syncCustomerToFirestore,
  deleteCustomerFromFirestore,
  syncPricingConfigToFirestore,
} from '../lib/firestoreSync';

export type UserRole = 'admin' | 'superadmin';

export type SyncStatus = 'connecting' | 'live' | 'offline' | 'error';

export interface PriceChangeLog {
  orderId: string;
  itemIndex: number;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  timestamp: string;
}

export interface StatusChangeLog {
  orderId: string;
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  timestamp: string;
}

interface AppState {
  currentUser: {
    role: UserRole;
    id: string;
  };
  orders: Order[];
  customers: Customer[];
  materials: Material[];
  pricingConfig: PricingConfig;
  priceChangeLogs: PriceChangeLog[];
  statusChangeLogs: StatusChangeLog[];

  // Sync
  syncStatus: SyncStatus;
  hasHydratedFromFirestore: boolean;
  setSyncStatus: (status: SyncStatus) => void;

  // Snapshot replacements (called by firestoreListeners)
  replaceOrders: (orders: Order[]) => void;
  replaceCustomers: (customers: Customer[]) => void;
  replaceMaterials: (materials: Material[]) => void;
  replacePricingConfig: (config: PricingConfig) => void;

  // User
  switchUser: (role: UserRole, userId?: string) => void;

  // Config
  updatePricingConfig: (config: Partial<PricingConfig>) => void;

  // Materials
  updateMaterials: (materials: Material[]) => void;
  addMaterial: (material: Material) => void;
  deleteMaterial: (materialId: string) => void;

  // Customers
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (customerId: string) => void;
  updateCustomerOrderCount: (customerId: string) => void;

  // Quotations (orders)
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  updateOrderItemPrice: (orderId: string, itemIndex: number, unitPrice: number) => void;
  deleteOrder: (orderId: string) => void;

  // Workflow transitions
  submitForApproval: (orderId: string) => void;
  internallyApproveOrder: (orderId: string) => void;
  sendToClient: (orderId: string) => void;
  rejectOrder: (orderId: string, reason: string) => void;
  approveOrder: (orderId: string, run: string, signatureDataUrl: string) => void;

  // Export
  exportOrdersCSV: (fromDate: string, toDate: string) => void;

  // Local cache clear (does NOT touch Firestore — snapshots will rehydrate)
  clearLocalCache: () => void;
}

// Empty defaults: Firestore is the source of truth. Local persisted state is a
// cache only; on cold start we show skeletons until the first snapshot lands.
const defaultState = {
  currentUser: { role: 'superadmin' as UserRole, id: 'superadmin1' },
  orders: [] as Order[],
  customers: [] as Customer[],
  materials: [] as Material[],
  pricingConfig: initialPricingConfig,
  priceChangeLogs: [] as PriceChangeLog[],
  statusChangeLogs: [] as StatusChangeLog[],
  syncStatus: 'connecting' as SyncStatus,
  hasHydratedFromFirestore: false,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      setSyncStatus: (status) =>
        set((state) => ({
          syncStatus: status,
          hasHydratedFromFirestore:
            state.hasHydratedFromFirestore || status === 'live' || status === 'offline',
        })),

      replaceOrders: (orders) => set({ orders }),
      replaceCustomers: (customers) => set({ customers }),
      replaceMaterials: (materials) => set({ materials }),
      replacePricingConfig: (pricingConfig) => set({ pricingConfig }),

      switchUser: (role, userId) => {
        const finalId = userId ?? (role === 'superadmin' ? 'superadmin1' : 'admin1');
        set({ currentUser: { role, id: finalId } });
      },

      updatePricingConfig: (config) => {
        const next = { ...get().pricingConfig, ...config };
        set({ pricingConfig: next });
        syncPricingConfigToFirestore(next).catch(() => {});
      },

      updateMaterials: (materials) => {
        const prev = get().materials;
        set({ materials });
        // Write only the ones that actually changed.
        const prevById = new Map(prev.map((m) => [m.id, m]));
        for (const m of materials) {
          if (prevById.get(m.id) !== m) syncMaterialToFirestore(m).catch(() => {});
        }
      },

      addMaterial: (material) => {
        set((state) => ({ materials: [...state.materials, material] }));
        syncMaterialToFirestore(material).catch(() => {});
      },

      deleteMaterial: (materialId) => {
        set((state) => ({
          materials: state.materials.filter((m) => m.id !== materialId),
        }));
        deleteMaterialFromFirestore(materialId).catch(() => {});
      },

      addCustomer: (customer) => {
        set((state) => ({ customers: [...state.customers, customer] }));
        syncCustomerToFirestore(customer).catch(() => {});
      },

      updateCustomer: (customer) => {
        set((state) => ({
          customers: state.customers.map((c) => (c.id === customer.id ? customer : c)),
        }));
        syncCustomerToFirestore(customer).catch(() => {});
      },

      deleteCustomer: (customerId) => {
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== customerId),
        }));
        deleteCustomerFromFirestore(customerId).catch(() => {});
      },

      updateCustomerOrderCount: (customerId) => {
        const updated = get().customers.map((c) =>
          c.id === customerId ? { ...c, orderCount: (c.orderCount ?? 0) + 1 } : c,
        );
        set({ customers: updated });
        const changed = updated.find((c) => c.id === customerId);
        if (changed) syncCustomerToFirestore(changed).catch(() => {});
      },

      addOrder: (order) => {
        set((state) => ({ orders: [...state.orders, order] }));
        syncOrderToFirestore(order).catch(() => {});
      },

      updateOrder: (order) => {
        set((state) => ({
          orders: state.orders.map((o) => (o.id === order.id ? order : o)),
        }));
        syncOrderToFirestore(order).catch(() => {});
      },

      updateOrderStatus: (orderId, status) =>
        set((state) => {
          const order = state.orders.find((o) => o.id === orderId);
          const log: StatusChangeLog = {
            orderId,
            fromStatus: order?.status ?? '',
            toStatus: status,
            changedBy: state.currentUser.id,
            timestamp: new Date().toISOString(),
          };
          const orders = state.orders.map((o) => (o.id === orderId ? { ...o, status } : o));
          const updated = orders.find((o) => o.id === orderId);
          if (updated) syncOrderToFirestore(updated).catch(() => {});
          return {
            orders,
            statusChangeLogs: [...state.statusChangeLogs, log],
          };
        }),

      updateOrderItemPrice: (orderId, itemIndex, unitPrice) =>
        set((state) => {
          const order = state.orders.find((o) => o.id === orderId);
          const oldPrice = order?.items[itemIndex]?.unitPrice ?? 0;
          const log: PriceChangeLog = {
            orderId,
            itemIndex,
            oldPrice,
            newPrice: unitPrice,
            changedBy: state.currentUser.id,
            timestamp: new Date().toISOString(),
          };
          const orders = state.orders.map((o) => {
            if (o.id !== orderId) return o;
            const items = o.items.map((item, idx) =>
              idx !== itemIndex
                ? item
                : { ...item, unitPrice, subtotal: unitPrice * item.quantity }
            );
            const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
            const installFee = o.installationFee ?? 0;
            const totalAmount = subtotal + state.pricingConfig.despachoCost + installFee;
            return { ...o, items, totalAmount };
          });
          const updated = orders.find((o) => o.id === orderId);
          if (updated) syncOrderToFirestore(updated).catch(() => {});
          return { orders, priceChangeLogs: [...state.priceChangeLogs, log] };
        }),

      deleteOrder: (orderId) => {
        set((state) => ({
          orders: state.orders.filter((o) => o.id !== orderId),
        }));
        deleteOrderFromFirestore(orderId).catch(() => {});
      },

      submitForApproval: (orderId) => {
        get().updateOrderStatus(orderId, 'Pendiente Aprobación');
      },

      internallyApproveOrder: (orderId) =>
        set((state) => {
          const log: StatusChangeLog = {
            orderId,
            fromStatus: state.orders.find((o) => o.id === orderId)?.status ?? '',
            toStatus: 'Aprobada Internamente',
            changedBy: state.currentUser.id,
            timestamp: new Date().toISOString(),
          };
          const orders = state.orders.map((o) =>
            o.id !== orderId
              ? o
              : {
                  ...o,
                  status: 'Aprobada Internamente' as const,
                  internalApproval: {
                    approvedBy: state.currentUser.id,
                    approvedAt: new Date().toISOString(),
                  },
                }
          );
          const updated = orders.find((o) => o.id === orderId);
          if (updated) syncOrderToFirestore(updated).catch(() => {});
          return {
            orders,
            statusChangeLogs: [...state.statusChangeLogs, log],
          };
        }),

      sendToClient: (orderId) =>
        set((state) => {
          const log: StatusChangeLog = {
            orderId,
            fromStatus: state.orders.find((o) => o.id === orderId)?.status ?? '',
            toStatus: 'Enviada al Cliente',
            changedBy: state.currentUser.id,
            timestamp: new Date().toISOString(),
          };
          const orders = state.orders.map((o) =>
            o.id !== orderId
              ? o
              : {
                  ...o,
                  status: 'Enviada al Cliente' as const,
                  sentToClientAt: new Date().toISOString(),
                  approvalStatus: 'pending' as const,
                }
          );
          const updated = orders.find((o) => o.id === orderId);
          if (updated) syncOrderToFirestore(updated).catch(() => {});
          return {
            orders,
            statusChangeLogs: [...state.statusChangeLogs, log],
          };
        }),

      rejectOrder: (orderId, reason) =>
        set((state) => {
          const log: StatusChangeLog = {
            orderId,
            fromStatus: state.orders.find((o) => o.id === orderId)?.status ?? '',
            toStatus: 'Rechazada',
            changedBy: state.currentUser.id,
            timestamp: new Date().toISOString(),
          };
          const orders = state.orders.map((o) =>
            o.id !== orderId
              ? o
              : { ...o, status: 'Rechazada' as const, rejectionReason: reason }
          );
          const updated = orders.find((o) => o.id === orderId);
          if (updated) syncOrderToFirestore(updated).catch(() => {});
          return {
            orders,
            statusChangeLogs: [...state.statusChangeLogs, log],
          };
        }),

      approveOrder: (orderId, run, signatureDataUrl) =>
        set((state) => {
          const log: StatusChangeLog = {
            orderId,
            fromStatus: state.orders.find((o) => o.id === orderId)?.status ?? '',
            toStatus: 'Aceptada',
            changedBy: 'cliente',
            timestamp: new Date().toISOString(),
          };
          const orders = state.orders.map((o) =>
            o.id !== orderId
              ? o
              : {
                  ...o,
                  status: 'Aceptada' as const,
                  approvalStatus: 'approved' as const,
                  approvalRun: run,
                  approvalTimestamp: new Date().toISOString(),
                  approvalSignatureDataUrl: signatureDataUrl,
                }
          );
          const updated = orders.find((o) => o.id === orderId);
          if (updated) syncOrderToFirestore(updated).catch(() => {});
          return {
            orders,
            statusChangeLogs: [...state.statusChangeLogs, log],
          };
        }),

      exportOrdersCSV: (fromDate, toDate) => {
        const { orders, customers } = get();
        const from = new Date(fromDate + 'T00:00:00');
        const to = new Date(toDate + 'T23:59:59');

        const filtered = orders.filter((o) => {
          if (!o.createdAt) return false;
          const d = new Date(o.createdAt);
          return d >= from && d <= to;
        });

        const customerMap = new Map(customers.map((c) => [c.id, c.name]));

        const header = [
          'ID',
          'Cotización',
          'Campaña',
          'Cliente',
          'Estado',
          'Total (CLP)',
          'Fecha Creación',
          'Fecha Entrega',
          'Aceptada Cliente',
        ];
        const rows = filtered.map((o) => [
          o.id,
          o.quotationCode ?? '',
          `"${o.campaignName.replace(/"/g, '""')}"`,
          `"${(customerMap.get(o.customerId) ?? o.customerId).replace(/"/g, '""')}"`,
          o.status,
          o.totalAmount,
          o.createdAt,
          o.deliveryDate ?? '',
          o.approvalStatus ?? '',
        ]);

        const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `viu-cotizaciones-${fromDate}-${toDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },

      // Clear the local cache only. Firestore stays untouched — snapshots will
      // rehydrate the store on the next tick. Never repopulates mock data.
      clearLocalCache: () =>
        set({
          orders: [],
          customers: [],
          materials: [],
          priceChangeLogs: [],
          statusChangeLogs: [],
          hasHydratedFromFirestore: false,
        }),
    }),
    {
      name: 'viu-manager-storage',
      version: 11,
      migrate: (_persistedState, fromVersion) => {
        // v11: Firestore is source of truth. Wipe local cache on migration so
        // no stale mock data lingers; snapshots will repopulate on next load.
        console.info('viu-manager store: migrating from v' + fromVersion + ' → v11 (Firestore backed)');
        return defaultState;
      },
      // syncStatus/hasHydratedFromFirestore are runtime concerns; don't persist.
      partialize: (state) => ({
        currentUser: state.currentUser,
        orders: state.orders,
        customers: state.customers,
        materials: state.materials,
        pricingConfig: state.pricingConfig,
        priceChangeLogs: state.priceChangeLogs,
        statusChangeLogs: state.statusChangeLogs,
      }),
    }
  )
);
