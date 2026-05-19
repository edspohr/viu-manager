
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initialOrders, type Order, type Customer, customers, materials, type Material, type PricingConfig, initialPricingConfig } from '../data/mockData';

export type UserRole = 'admin' | 'client' | 'operations' | 'superadmin';

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

  // Actions
  switchUser: (role: UserRole, userId?: string) => void;
  updatePricingConfig: (config: Partial<PricingConfig>) => void;

  // Material Actions
  updateMaterials: (materials: Material[]) => void;
  addMaterial: (material: Material) => void;
  deleteMaterial: (materialId: string) => void;

  // Customer Actions
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (customerId: string) => void;

  // Order Actions
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  updateFileStatus: (orderId: string, status: Order['fileStatus']) => void;
  updateOrderItemPrice: (orderId: string, itemIndex: number, unitPrice: number) => void;
  updateOperationsChecklist: (orderId: string, checklist: boolean[]) => void;
  updateMachineAssignment: (orderId: string, machine: string) => void;
  updateManHours: (orderId: string, hours: number) => void;
  updateOvertimeEnabled: (orderId: string, enabled: boolean) => void;
  approveOrder: (orderId: string, run: string, signatureDataUrl: string) => void;
  updateOrderExternal: (orderId: string, isExternal: boolean, externalSupplier: string) => void;

  // Export
  exportOrdersCSV: (fromDate: string, toDate: string) => void;

  // Reset
  resetStore: () => void;
}

const defaultState = {
  currentUser: { role: 'admin' as UserRole, id: 'admin1' },
  orders: initialOrders,
  customers: customers,
  materials: materials,
  pricingConfig: initialPricingConfig,
  priceChangeLogs: [] as PriceChangeLog[],
  statusChangeLogs: [] as StatusChangeLog[],
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      switchUser: (role, userId = 'admin1') => {
        let finalId = userId;
        if (role === 'client' && userId === 'admin1') finalId = 'c1';
        set({ currentUser: { role, id: finalId } });
      },

      updatePricingConfig: (config) => set((state) => ({
        pricingConfig: { ...state.pricingConfig, ...config }
      })),

      updateMaterials: (materials) => set({ materials }),

      addMaterial: (material) => set((state) => ({
        materials: [...state.materials, material],
      })),

      deleteMaterial: (materialId) => set((state) => ({
        materials: state.materials.filter((m) => m.id !== materialId),
      })),

      addCustomer: (customer) => set((state) => ({
        customers: [...state.customers, customer],
      })),

      updateCustomer: (customer) => set((state) => ({
        customers: state.customers.map((c) => (c.id === customer.id ? customer : c)),
      })),

      deleteCustomer: (customerId) => set((state) => ({
        customers: state.customers.filter((c) => c.id !== customerId),
      })),

      addOrder: (order) => set((state) => ({
        orders: [...state.orders, order]
      })),

      updateOrderStatus: (orderId, status) => set((state) => {
        const order = state.orders.find((o) => o.id === orderId);
        const log: StatusChangeLog = {
          orderId,
          fromStatus: order?.status ?? '',
          toStatus: status,
          changedBy: state.currentUser.id,
          timestamp: new Date().toISOString(),
        };
        return {
          orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
          statusChangeLogs: [...state.statusChangeLogs, log],
        };
      }),

      updateFileStatus: (orderId, status) => set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? { ...o, fileStatus: status } : o)),
      })),

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
          return {
            orders: state.orders.map((order) => {
              if (order.id !== orderId) return order;
              const items = order.items.map((item, idx) =>
                idx !== itemIndex ? item : { ...item, unitPrice, subtotal: unitPrice * item.quantity }
              );
              const totalAmount =
                items.reduce((s, i) => s + i.subtotal, 0) + state.pricingConfig.despachoCost;
              return { ...order, items, totalAmount };
            }),
            priceChangeLogs: [...state.priceChangeLogs, log],
          };
        }),

      updateOperationsChecklist: (orderId, checklist) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id !== orderId ? o : { ...o, operationsChecklist: checklist }
          ),
        })),

      updateMachineAssignment: (orderId, machine) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id !== orderId ? o : { ...o, machineAssignment: machine }
          ),
        })),

      updateManHours: (orderId, hours) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id !== orderId ? o : { ...o, manHours: hours }
          ),
        })),

      updateOvertimeEnabled: (orderId, enabled) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id !== orderId ? o : { ...o, overtimeEnabled: enabled }
          ),
        })),

      approveOrder: (orderId, run, signatureDataUrl) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id !== orderId
              ? o
              : {
                  ...o,
                  approvalStatus: 'approved',
                  approvalRun: run,
                  approvalTimestamp: new Date().toISOString(),
                  approvalSignatureDataUrl: signatureDataUrl,
                }
          ),
        })),

      updateOrderExternal: (orderId, isExternal, externalSupplier) =>
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id !== orderId ? o : { ...o, isExternal, externalSupplier }
          ),
        })),

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

        const header = ['ID', 'Campaña', 'Cliente', 'Estado', 'Total (CLP)', 'Fecha Creación', 'Fecha Entrega', 'Aprobación'];
        const rows = filtered.map((o) => [
          o.id,
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
        a.download = `viu-ordenes-${fromDate}-${toDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },

      resetStore: () => set(defaultState),
    }),
    {
      name: 'viu-manager-storage',
      version: 7,
      migrate: (_persistedState: unknown, _version: number) => {
        // v7: audit logs added, mock data purged — always reset to clean default
        return defaultState;
      },
    }
  )
);
