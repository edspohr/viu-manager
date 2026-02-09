

export interface Customer {
  id: string;
  name: string;
  type: 'Complejo' | 'Recurrente' | 'Esporádico';
  contact: string;
  debt: number;
}

export interface Material {
  id: string;
  name: string;
  type: 'Rígido' | 'Flexible';
  stock: number;
  unit: string;
  pricePerUnit: number; // Base price for calculation
}

export interface Order {
  id: string;
  customerId: string;
  campaignName: string;
  status: 'Leads' | 'En Cotización' | 'Por Aprobar' | 'En Producción' | 'Despacho' | 'Cobranza';
  items: OrderItem[];
  totalAmount: number;
  deliveryDate: string;
  createdAt: string;
  fileStatus: 'Rojo' | 'Amarillo' | 'Verde';
}

export interface OrderItem {
  materialId: string;
  width: number;
  height: number;
  quantity: number;
  finishing: string[];
}

export const customers: Customer[] = [
  { id: 'c1', name: 'Fashion Park', type: 'Complejo', contact: 'Paulina', debt: 4500000 },
  { id: 'c2', name: 'La Guinda', type: 'Recurrente', contact: 'Maria Paz', debt: 0 },
  { id: 'c3', name: 'Puzle Partner', type: 'Esporádico', contact: 'Juan', debt: 120000 },
];

export const materials: Material[] = [
  { id: 'm1', name: 'Foam 5MM (Fomex)', type: 'Rígido', stock: 120, unit: 'planchas', pricePerUnit: 15000 },
  { id: 'm2', name: 'Sintra 3MM (PVC)', type: 'Rígido', stock: 85, unit: 'planchas', pricePerUnit: 12000 },
  { id: 'm3', name: 'Sintra 5MM (PVC)', type: 'Rígido', stock: 40, unit: 'planchas', pricePerUnit: 18000 },
  { id: 'm4', name: 'PP Alveolar 6MM', type: 'Rígido', stock: 200, unit: 'planchas', pricePerUnit: 8000 },
  { id: 'm5', name: 'Adhesivo Laminado', type: 'Flexible', stock: 500, unit: 'm', pricePerUnit: 4500 },
  { id: 'm6', name: 'Vinilo Blanco Plotter', type: 'Flexible', stock: 300, unit: 'm', pricePerUnit: 3800 },
  { id: 'm7', name: 'Tela PVC', type: 'Flexible', stock: 150, unit: 'm', pricePerUnit: 6000 },
];

export const initialOrders: Order[] = [
  {
    id: 'o1',
    customerId: 'c1',
    campaignName: 'Campaña Escolar 2024',
    status: 'Por Aprobar',
    items: [
      { materialId: 'm1', width: 120, height: 240, quantity: 50, finishing: ['Corte Recto'] },
    ],
    totalAmount: 2500000,
    deliveryDate: '2024-03-01',
    createdAt: '2024-02-10',
    fileStatus: 'Amarillo',
  },
  {
    id: 'o2',
    customerId: 'c2',
    campaignName: 'Lanzamiento Verano',
    status: 'En Producción',
    items: [
      { materialId: 'm5', width: 50, height: 50, quantity: 200, finishing: ['Troquelado'] },
    ],
    totalAmount: 850000,
    deliveryDate: '2024-02-20',
    createdAt: '2024-02-05',
    fileStatus: 'Verde',
  },
  {
    id: 'o3',
    customerId: 'c3',
    campaignName: 'Cartelería Evento',
    status: 'Cobranza',
    items: [
      { materialId: 'm2', width: 60, height: 90, quantity: 10, finishing: [] },
    ],
    totalAmount: 120000,
    deliveryDate: '2024-01-15',
    createdAt: '2024-01-10',
    fileStatus: 'Verde',
  },
   {
    id: 'o4',
    customerId: 'c1',
    campaignName: 'Remodelación Tienda Centro',
    status: 'Leads',
    items: [],
    totalAmount: 0,
    deliveryDate: '',
    createdAt: '2024-02-12',
    fileStatus: 'Rojo',
  },
];
