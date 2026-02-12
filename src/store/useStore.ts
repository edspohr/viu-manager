
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initialOrders, type Order, type Customer, customers, materials, type Material, type PricingConfig, initialPricingConfig } from '../data/mockData';

export type UserRole = 'admin' | 'client' | 'operations' | 'superadmin';

interface AppState {
  currentUser: {
    role: UserRole;
    id: string; // Simulate logged in user ID (e.g. 'c1' for client)
  };
  orders: Order[];
  customers: Customer[];
  materials: Material[];
  pricingConfig: PricingConfig;
  
  // Actions
  switchUser: (role: UserRole, userId?: string) => void;
  updatePricingConfig: (config: Partial<PricingConfig>) => void;
  
  // Order Actions
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  updateFileStatus: (orderId: string, status: Order['fileStatus']) => void;
  
  // Reset
  resetStore: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: { role: 'admin', id: 'admin1' },
      orders: initialOrders,
      customers: customers,
      materials: materials,
      pricingConfig: initialPricingConfig,

      switchUser: (role, userId = 'admin1') => {
        // Auto-assign correct ID for demo purposes
        let finalId = userId;
        if (role === 'client' && userId === 'admin1') finalId = 'c1'; // Default to Fashion Park
        console.log(`[Store] Switching to ${role} (${finalId})`);
        set({ currentUser: { role, id: finalId } });
      },

      updatePricingConfig: (config) => set((state) => ({
        pricingConfig: { ...state.pricingConfig, ...config }
      })),

      addOrder: (order) => set((state) => ({ 
        orders: [...state.orders, order] 
      })),

      updateOrderStatus: (orderId, status) => set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
      })),

      updateFileStatus: (orderId, status) => set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? { ...o, fileStatus: status } : o)),
      })),

      resetStore: () => set({
        currentUser: { role: 'admin', id: 'admin1' },
        orders: initialOrders,
        customers: customers,
        materials: materials,
        pricingConfig: initialPricingConfig,
      }),
    }),
    {
      name: 'viu-manager-storage',
    }
  )
);
