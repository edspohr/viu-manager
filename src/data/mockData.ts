export interface Customer {
  id: string;
  name: string;
  type: "Complejo" | "Recurrente" | "Esporádico";
  contact: string;
  debt: number;
}

export interface Material {
  id: string;
  name: string;
  type: "Rígido" | "Flexible";
  stock: number;
  unit: string; // "planchas" for rigid, "m" for flexible
  supplier1Price: number; // CLP per plancha (rigid) or CLP per m² (flexible)
  supplier2Price: number;
  supplier3Price: number;
  activeSupplier: 1 | 2 | 3 | "average";
  sheetWidth?: number; // cm — only for rigid, safety perimeter: 120×240
  sheetHeight?: number; // cm — only for rigid, safety perimeter: 120×240
  minPrice?: number; // minimum CLP per piece (floor price)
}

export interface OrderItem {
  materialId: string;
  width: number;         // cm
  height: number;        // cm
  quantity: number;
  finishing: string[];
  doubleSided: boolean;
  // Calculated fields (set by quoteEngine, editable by admin):
  suggestedUnitPrice: number;
  unitPrice: number;
  subtotal: number;
  calculationBreakdown: {
    baseCost: number;
    finishingMultiplier: number;
    finishingAddons: number;
    planchasUsed?: number;
  };
}

export interface Order {
  id: string;
  customerId: string;
  campaignName: string;
  description: string;
  status:
    | "Solicitud"
    | "Por Aprobar"
    | "En Producción"
    | "Despacho"
    | "Terminado";
  items: OrderItem[];
  totalAmount: number;
  deliveryDate: string;
  createdAt: string;
  fileStatus: "Rojo" | "Amarillo" | "Verde";
  operationsChecklist?: boolean[]; // 5-item checklist, persisted
  aiGenerated?: boolean;
  machineAssignment?: string;
  manHours?: number;
  overtimeEnabled?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvalRun?: string;       // Chilean RUN, format XX.XXX.XXX-X
  approvalTimestamp?: string;
  approvalSignatureDataUrl?: string;
}

export interface PricingConfig {
  // Rigid material calculation
  rigidMargin: number; // markup on top of raw plancha cost, e.g. 0.4 = 40%
  // Flexible material global margin (applied after all other calculations)
  globalMargin: number; // e.g. 0.35 = 35%
  // Finishing multipliers (applied to base unit price)
  finishingMultipliers: {
    "Corte Recto": number; // 1.0 (baseline)
    Troquelado: number; // 1.5
    "Corte CNC": number; // 1.8
    "Tiro y Retiro": number; // 2.0
    "Corte Contorno": number; // 1.6
    [key: string]: number;
  };
  // Per-unit finishing add-ons (CLP added per piece)
  finishingAddons: {
    Ojetillos: number; // 800 CLP per unit
    "Pie de Apoyo": number; // 2500 CLP per unit
    "Bolsillo Superior": number; // 1500 CLP per unit
    Refuerzo: number; // 1000 CLP per unit
    [key: string]: number;
  };
  // Order-level fees
  despachoCost: number; // flat fee per order, e.g. 15000
  instalacionDefault: number; // default suggestion, e.g. 50000
  // Machine list — editable by superadmin
  machines: string[];
}

export const initialPricingConfig: PricingConfig = {
  rigidMargin: 0.4,
  globalMargin: 0.35,
  finishingMultipliers: {
    "Corte Recto": 1.0,
    Troquelado: 1.5,
    "Corte CNC": 1.8,
    "Tiro y Retiro": 2.0,
    "Corte Contorno": 1.6,
    "Pegado Capas": 1.3,
  },
  finishingAddons: {
    Ojetillos: 800,
    "Pie de Apoyo": 2500,
    "Bolsillo Superior": 1500,
    Refuerzo: 1000,
    Instalación: 0,
  },
  despachoCost: 15000,
  instalacionDefault: 50000,
  machines: ['Plotter Roland 1', 'Plotter Roland 2', 'Mesa CNC', 'Laminadora', 'Manual'],
};

// §4.3 — All mock/test data purged before production deploy
export const customers: Customer[] = [];
export const materials: Material[] = [];
export const initialOrders: Order[] = [];
