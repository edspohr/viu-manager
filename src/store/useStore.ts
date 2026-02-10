import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initialOrders, type Order, type Customer, customers, materials, type Material } from '../data/mockData';

type UserRole = 'admin' | 'client' | 'operations';

interface AppState {
  currentUser: UserRole;
  orders: Order[];
  customers: Customer[];
  materials: Material[];
  switchUser: (role: UserRole) => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  updateFileStatus: (orderId: string, status: Order['fileStatus']) => void;
  approveOrder: (orderId: string) => void;
  resetStore: () => void;
  setOrders: (orders: Order[]) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: 'admin',
      orders: initialOrders,
      customers: customers,
      materials: materials,
      switchUser: (role) => set({ currentUser: role }),
      addOrder: (order) => set((state) => ({ orders: [...state.orders, order] })),
      updateOrderStatus: (orderId, status) => set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
      })),
      updateFileStatus: (orderId, status) => set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? { ...o, fileStatus: status } : o)),
      })),
      approveOrder: (orderId) => set((state) => ({
        orders: state.orders.map((o) => 
          o.id === orderId ? { ...o, status: 'En Producción' } : o
        ),
      })),
      resetStore: () => set({
        currentUser: 'admin',
        orders: initialOrders,
        customers: customers,
        materials: materials,
      }),
      setOrders: (orders) => set({ orders }),
    }),
    {
      name: 'viu-manager-storage',
    }
  )
);
