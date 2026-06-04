export interface Customer {
  id: string;
  name: string;
  type: "Complejo" | "Recurrente" | "Esporádico";
  contact: string;
  debt: number;
  // Extended fields (v8)
  rut: string;
  projectManager: string;
  address: string;
  segment: "A" | "B" | "C";
  clientCode: string; // 3-letter code for quotation numbers, e.g. "SBX"
  initialCorrelative: number; // starting sequence number, default 1
  orderCount: number; // incremented on each new order, default 0
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
    laborCost: number;
    finishingMultiplier: number;
    finishingAddons: number;
    segmentMultiplier: number;
    planchasUsed?: number;
  };
}

export type QuotationStatus =
  | "Borrador"
  | "Pendiente Aprobación"
  | "Aprobada Internamente"
  | "Enviada al Cliente"
  | "Aceptada"
  | "Rechazada";

export interface Order {
  id: string;
  customerId: string;
  campaignName: string;
  description: string;
  status: QuotationStatus;
  items: OrderItem[];
  totalAmount: number;
  deliveryDate: string;
  createdAt: string;
  aiGenerated?: boolean;
  // Internal approval (by superadmin)
  internalApproval?: {
    approvedBy: string;
    approvedAt: string;
  };
  sentToClientAt?: string;
  rejectionReason?: string;
  // Client acceptance (via public link)
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvalRun?: string;       // Chilean RUN, format XX.XXX.XXX-X
  approvalTimestamp?: string;
  approvalSignatureDataUrl?: string;
  // Quotation metadata
  quotationCode?: string;       // e.g. "SBX028"
  isSplitQuote?: boolean;
  splitPartA?: OrderItem[];
  splitPartB?: OrderItem[];
  requiresInstallation?: boolean;
  installationFee?: number;
  eventName?: string;
  weekendSurcharge?: boolean;
}

export interface PricingConfig {
  // Segment-based multipliers (replaces rigidMargin / globalMargin)
  segmentMultipliers: { A: number; B: number; C: number };
  // Labor pricing
  laborHourRate: number;       // CLP per hour, default 15000
  overtimeMultiplier: number;  // default 1.5 (+50% to labor)
  weekendMultiplier: number;   // default 1.25 (+25% to labor)
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
  despachoCost: number;        // flat fee per order, e.g. 15000
  instalacionDefault: number;  // default suggestion, e.g. 50000
  // Delivery lead time (SuperAdmin configurable)
  deliveryLeadDays: number;    // default 7
  // Company info for PDF generation
  empresaRut: string;
  empresaPhone: string;
  empresaEmail: string;
  bankDetails: string;
}

export const initialPricingConfig: PricingConfig = {
  segmentMultipliers: { A: 2.2, B: 2.0, C: 1.8 },
  laborHourRate: 15000,
  overtimeMultiplier: 1.5,
  weekendMultiplier: 1.25,
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
  deliveryLeadDays: 7,
  empresaRut: '',
  empresaPhone: '',
  empresaEmail: '',
  bankDetails: '',
};

// §4.3 — No test orders or test customers. Materials are production defaults.
export const customers: Customer[] = [];

export const initialOrders: Order[] = [];

// Default material catalog — prices editable by admin/superadmin in PricingConfigModal
export const materials: Material[] = [
  {
    id: "m1",
    name: "Foam 5MM (Fomex)",
    type: "Rígido",
    stock: 0,
    unit: "planchas",
    supplier1Price: 15000,
    supplier2Price: 0,
    supplier3Price: 0,
    activeSupplier: 1,
    sheetWidth: 120,
    sheetHeight: 240,
    minPrice: 1500,
  },
  {
    id: "m2",
    name: "Sintra 3MM (Trovicel)",
    type: "Rígido",
    stock: 0,
    unit: "planchas",
    supplier1Price: 12000,
    supplier2Price: 0,
    supplier3Price: 0,
    activeSupplier: 1,
    sheetWidth: 120,
    sheetHeight: 240,
    minPrice: 1500,
  },
  {
    id: "m3",
    name: "Sintra 5MM (PVC)",
    type: "Rígido",
    stock: 0,
    unit: "planchas",
    supplier1Price: 18000,
    supplier2Price: 0,
    supplier3Price: 0,
    activeSupplier: 1,
    sheetWidth: 120,
    sheetHeight: 240,
    minPrice: 2000,
  },
  {
    id: "m4",
    name: "PP Alveolar 6MM",
    type: "Rígido",
    stock: 0,
    unit: "planchas",
    supplier1Price: 8000,
    supplier2Price: 0,
    supplier3Price: 0,
    activeSupplier: 1,
    sheetWidth: 120,
    sheetHeight: 240,
    minPrice: 1200,
  },
  {
    id: "m5",
    name: "Adhesivo Laminado Matte",
    type: "Flexible",
    stock: 0,
    unit: "m",
    supplier1Price: 9000,
    supplier2Price: 0,
    supplier3Price: 0,
    activeSupplier: 1,
  },
  {
    id: "m6",
    name: "Adhesivo Black Out Matte",
    type: "Flexible",
    stock: 0,
    unit: "m",
    supplier1Price: 7770,
    supplier2Price: 0,
    supplier3Price: 0,
    activeSupplier: 1,
  },
  {
    id: "m7",
    name: "Vinilo Blanco Plotter",
    type: "Flexible",
    stock: 0,
    unit: "m",
    supplier1Price: 10500,
    supplier2Price: 0,
    supplier3Price: 0,
    activeSupplier: 1,
  },
  {
    id: "m8",
    name: "Tela PVC",
    type: "Flexible",
    stock: 0,
    unit: "m",
    supplier1Price: 6800,
    supplier2Price: 0,
    supplier3Price: 0,
    activeSupplier: 1,
  },
  {
    id: "m9",
    name: "Floorgraphic Laminado Piso",
    type: "Flexible",
    stock: 0,
    unit: "m",
    supplier1Price: 11500,
    supplier2Price: 0,
    supplier3Price: 0,
    activeSupplier: 1,
  },
];
