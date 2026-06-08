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

export type MaterialUnitMode = "per_plancha" | "per_m2" | "per_roll";

export interface Material {
  id: string;
  name: string;
  type: "Rígido" | "Flexible";
  stock: number;
  unit: string; // "planchas" for rigid, "m" for flexible, "resma" for digital paper
  // supplier1Price meaning depends on unitMode:
  //   per_plancha → CLP per plancha
  //   per_m2      → CLP per m²
  //   per_roll    → CLP per whole roll (derive $/m² from rollWidth × rollLength at quote time)
  supplier1Price: number;
  supplier2Price: number;
  supplier3Price: number;
  activeSupplier: 1 | 2 | 3 | "average";
  sheetWidth?: number; // cm — only for per_plancha
  sheetHeight?: number; // cm — only for per_plancha
  minPrice?: number; // minimum CLP per piece (floor price)
  // Extended (DIPISA April 2025 catalog)
  unitMode?: MaterialUnitMode; // optional for backwards compat; defaults inferred from type
  rollWidth?: number; // m — for per_m2 / per_roll items
  rollLength?: number; // m — for per_m2 / per_roll items
  brand?: string; // e.g. ADTACK, 3M, AVERY, FEDRIGONI
  supplierCode?: string; // DIPISA SKU
  category?: string; // source sheet, e.g. "TELAS PVC"
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

// Seed clients from docs/CLIENTES VIU-2.xlsx (12 known VIU customers).
// Codes auto-derived from name; user can refine in Settings → Clientes.
export const customers: Customer[] = [
  { id: "c-laguinda",    name: "LA GUINDA",                type: "Recurrente", contact: "", debt: 0, rut: "76.029.357-1", projectManager: "", address: "", segment: "B", clientCode: "LAG", initialCorrelative: 1, orderCount: 0 },
  { id: "c-levislaguinda", name: "LEVIS LA GUINDA",        type: "Recurrente", contact: "", debt: 0, rut: "76.029.357-1", projectManager: "", address: "", segment: "B", clientCode: "LLG", initialCorrelative: 1, orderCount: 0 },
  { id: "c-hollyconcept", name: "HOLLY CONCEPT",           type: "Recurrente", contact: "", debt: 0, rut: "77.790.766-2", projectManager: "", address: "", segment: "B", clientCode: "HOC", initialCorrelative: 1, orderCount: 0 },
  { id: "c-dutties",     name: "DUTTIES",                  type: "Recurrente", contact: "", debt: 0, rut: "78.066.387-1", projectManager: "", address: "", segment: "B", clientCode: "DUT", initialCorrelative: 1, orderCount: 0 },
  { id: "c-fashionpark", name: "FASHION PARK",             type: "Recurrente", contact: "", debt: 0, rut: "78.553.100-1", projectManager: "", address: "", segment: "B", clientCode: "FAP", initialCorrelative: 1, orderCount: 0 },
  { id: "c-pepper",      name: "PEPPER",                   type: "Recurrente", contact: "", debt: 0, rut: "76.755.090-1", projectManager: "", address: "", segment: "B", clientCode: "PEP", initialCorrelative: 1, orderCount: 0 },
  { id: "c-mcinfinit",   name: "MC INFINIT",               type: "Recurrente", contact: "", debt: 0, rut: "78.138.675-8", projectManager: "", address: "", segment: "B", clientCode: "MCI", initialCorrelative: 1, orderCount: 0 },
  { id: "c-pdvpublicidad", name: "PDV PUBLICIDAD (HERNAN)", type: "Recurrente", contact: "", debt: 0, rut: "78.054.744-8", projectManager: "Hernán", address: "", segment: "B", clientCode: "PDV", initialCorrelative: 1, orderCount: 0 },
  { id: "c-sokobox",     name: "SOKOBOX",                  type: "Recurrente", contact: "", debt: 0, rut: "76.468.448-6", projectManager: "", address: "", segment: "B", clientCode: "SBX", initialCorrelative: 1, orderCount: 0 },
  { id: "c-walzdisenos", name: "WALZ DISEÑOS",             type: "Recurrente", contact: "", debt: 0, rut: "76.943.478-K", projectManager: "", address: "", segment: "B", clientCode: "WAL", initialCorrelative: 1, orderCount: 0 },
  { id: "c-malex",       name: "MALEX",                    type: "Recurrente", contact: "", debt: 0, rut: "77.245.748-0", projectManager: "", address: "", segment: "B", clientCode: "MAL", initialCorrelative: 1, orderCount: 0 },
  { id: "c-paularestrepo", name: "PAULA RESTREPO",         type: "Recurrente", contact: "", debt: 0, rut: "76.488.031-5", projectManager: "", address: "", segment: "B", clientCode: "PAR", initialCorrelative: 1, orderCount: 0 },
];

export const initialOrders: Order[] = [];

// Default material catalog imported from DIPISA April 2025 price list.
// Source file: docs/DIPISA - Lista de Precios ABRIL 2025 ... .xls
// Regenerate via:  node scripts/parseDipisa.mjs > src/data/dipisaMaterials.ts
export { dipisaMaterials as materials } from "./dipisaMaterials";
