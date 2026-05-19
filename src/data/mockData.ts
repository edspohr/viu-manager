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
};

export const customers: Customer[] = [
  {
    id: "c1",
    name: "Fashion Park",
    type: "Complejo",
    contact: "Paulina",
    debt: 4500000,
  },
  {
    id: "c2",
    name: "La Guinda",
    type: "Recurrente",
    contact: "Maria Paz",
    debt: 0,
  },
  {
    id: "c3",
    name: "Puzle Partner",
    type: "Esporádico",
    contact: "Juan",
    debt: 120000,
  },
  {
    id: "c4",
    name: "TechStore Chile",
    type: "Recurrente",
    contact: "Roberto",
    debt: 0,
  },
  {
    id: "c5",
    name: "Mundo Joven",
    type: "Complejo",
    contact: "Camila",
    debt: 890000,
  },
];

export const materials: Material[] = [
  {
    id: "m1",
    name: "Foam 5MM (Fomex)",
    type: "Rígido",
    stock: 120,
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
    stock: 85,
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
    stock: 40,
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
    stock: 200,
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
    stock: 500,
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
    stock: 300,
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
    stock: 300,
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
    stock: 150,
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
    stock: 100,
    unit: "m",
    supplier1Price: 11500,
    supplier2Price: 0,
    supplier3Price: 0,
    activeSupplier: 1,
  },
];

export const initialOrders: Order[] = [
  {
    id: "o1",
    customerId: "c1",
    campaignName: "Summer Sale 50% Off",
    description:
      "Urgent request for 50 foam boards for the main window display. Must be durable.",
    status: "Por Aprobar",
    items: [
      {
        materialId: "m1",
        width: 120,
        height: 240,
        quantity: 50,
        finishing: ["Corte Recto"],
        doubleSided: false,
        suggestedUnitPrice: 0,
        unitPrice: 0,
        subtotal: 0,
        calculationBreakdown: { baseCost: 0, finishingMultiplier: 1, finishingAddons: 0 },
      },
    ],
    totalAmount: 2500000,
    deliveryDate: "2026-03-01",
    createdAt: "2026-02-10",
    fileStatus: "Amarillo",
  },
  {
    id: "o2",
    customerId: "c2",
    campaignName: "New Collection Launch",
    description:
      "Small stickers for product packaging. 200 units on high quality vinyl.",
    status: "En Producción",
    items: [
      {
        materialId: "m5",
        width: 50,
        height: 50,
        quantity: 200,
        finishing: ["Troquelado"],
        doubleSided: false,
        suggestedUnitPrice: 0,
        unitPrice: 0,
        subtotal: 0,
        calculationBreakdown: { baseCost: 0, finishingMultiplier: 1.5, finishingAddons: 0 },
      },
    ],
    totalAmount: 850000,
    deliveryDate: "2026-02-20",
    createdAt: "2026-02-05",
    fileStatus: "Verde",
  },
  {
    id: "o3",
    customerId: "c3",
    campaignName: "Event Signage",
    description:
      "Directional signs for the upcoming tech conference. Requires rigid PVC.",
    status: "Terminado",
    items: [
      { materialId: "m2", width: 60, height: 90, quantity: 10, finishing: [], doubleSided: false, suggestedUnitPrice: 0, unitPrice: 0, subtotal: 0, calculationBreakdown: { baseCost: 0, finishingMultiplier: 1, finishingAddons: 0 } },
    ],
    totalAmount: 120000,
    deliveryDate: "2026-01-15",
    createdAt: "2026-01-10",
    fileStatus: "Verde",
  },
  {
    id: "o4",
    customerId: "c1",
    campaignName: "Store Renovation",
    description:
      "Complete overhaul of the store branding. Pending final artworks.",
    status: "Solicitud",
    items: [],
    totalAmount: 0,
    deliveryDate: "",
    createdAt: "2026-02-12",
    fileStatus: "Rojo",
  },
  {
    id: "o5",
    customerId: "c4",
    campaignName: "Black Friday Prep",
    description: "Early preparation for Black Friday. Large banners.",
    status: "Despacho",
    items: [
      {
        materialId: "m7",
        width: 300,
        height: 100,
        quantity: 5,
        finishing: ["Ojetillos", "Refuerzo"],
        doubleSided: false,
        suggestedUnitPrice: 0,
        unitPrice: 0,
        subtotal: 0,
        calculationBreakdown: { baseCost: 0, finishingMultiplier: 1, finishingAddons: 1800 },
      },
    ],
    totalAmount: 450000,
    deliveryDate: "2026-02-15",
    createdAt: "2026-01-25",
    fileStatus: "Verde",
  },
  {
    id: "o6",
    customerId: "c5",
    campaignName: "Spring Vibe",
    description: "Floral patterns on Sintra 5mm for interior decor.",
    status: "Por Aprobar",
    items: [
      {
        materialId: "m3",
        width: 100,
        height: 100,
        quantity: 20,
        finishing: ["Corte CNC"],
        doubleSided: false,
        suggestedUnitPrice: 0,
        unitPrice: 0,
        subtotal: 0,
        calculationBreakdown: { baseCost: 0, finishingMultiplier: 1.8, finishingAddons: 0 },
      },
    ],
    totalAmount: 980000,
    deliveryDate: "2026-03-05",
    createdAt: "2026-02-11",
    fileStatus: "Amarillo",
  },
  {
    id: "o7",
    customerId: "c2",
    campaignName: "Monthly Promo",
    description: "Standard monthly promotional standees.",
    status: "Solicitud",
    items: [
      {
        materialId: "m4",
        width: 80,
        height: 200,
        quantity: 15,
        finishing: ["Pie de Apoyo"],
        doubleSided: false,
        suggestedUnitPrice: 0,
        unitPrice: 0,
        subtotal: 0,
        calculationBreakdown: { baseCost: 0, finishingMultiplier: 1, finishingAddons: 2500 },
      },
    ],
    totalAmount: 0,
    deliveryDate: "",
    createdAt: "2026-02-12",
    fileStatus: "Rojo",
  },
  {
    id: "o8",
    customerId: "c3",
    campaignName: "Office Branding",
    description: "Logo cutouts for the new reception area.",
    status: "En Producción",
    items: [
      {
        materialId: "m2",
        width: 120,
        height: 60,
        quantity: 1,
        finishing: ["Corte Contorno"],
        doubleSided: false,
        suggestedUnitPrice: 0,
        unitPrice: 0,
        subtotal: 0,
        calculationBreakdown: { baseCost: 0, finishingMultiplier: 1.6, finishingAddons: 0 },
      },
    ],
    totalAmount: 150000,
    deliveryDate: "2026-02-18",
    createdAt: "2026-02-08",
    fileStatus: "Verde",
  },
  {
    id: "o9",
    customerId: "c1",
    campaignName: "Window Display A",
    description: "Complex layered foam structure for main window.",
    status: "En Producción",
    items: [
      {
        materialId: "m1",
        width: 200,
        height: 200,
        quantity: 2,
        finishing: ["Pegado Capas", "Pintura"],
        doubleSided: false,
        suggestedUnitPrice: 0,
        unitPrice: 0,
        subtotal: 0,
        calculationBreakdown: { baseCost: 0, finishingMultiplier: 1.3, finishingAddons: 0 },
      },
    ],
    totalAmount: 1200000,
    deliveryDate: "2026-02-25",
    createdAt: "2026-02-01",
    fileStatus: "Verde",
  },
  {
    id: "o10",
    customerId: "c4",
    campaignName: "Gaming Event",
    description: "Backdrop for gaming tournament stream.",
    status: "Terminado",
    items: [
      {
        materialId: "m7",
        width: 400,
        height: 250,
        quantity: 1,
        finishing: ["Bolsillo Superior"],
        doubleSided: false,
        suggestedUnitPrice: 0,
        unitPrice: 0,
        subtotal: 0,
        calculationBreakdown: { baseCost: 0, finishingMultiplier: 1, finishingAddons: 1500 },
      },
    ],
    totalAmount: 350000,
    deliveryDate: "2026-01-30",
    createdAt: "2026-01-20",
    fileStatus: "Verde",
  },
  {
    id: "o11",
    customerId: "c5",
    campaignName: "Education Fair",
    description: "Booth materials for the annual education fair.",
    status: "Despacho",
    items: [
      { materialId: "m4", width: 90, height: 210, quantity: 10, finishing: [], doubleSided: false, suggestedUnitPrice: 0, unitPrice: 0, subtotal: 0, calculationBreakdown: { baseCost: 0, finishingMultiplier: 1, finishingAddons: 0 } },
    ],
    totalAmount: 600000,
    deliveryDate: "2026-02-14",
    createdAt: "2026-01-28",
    fileStatus: "Verde",
  },
  {
    id: "o12",
    customerId: "c2",
    campaignName: "Clearance Signs",
    description: "Simple red and white clearance signs.",
    status: "Por Aprobar",
    items: [
      { materialId: "m4", width: 50, height: 70, quantity: 100, finishing: [], doubleSided: false, suggestedUnitPrice: 0, unitPrice: 0, subtotal: 0, calculationBreakdown: { baseCost: 0, finishingMultiplier: 1, finishingAddons: 0 } },
    ],
    totalAmount: 500000,
    deliveryDate: "2026-02-28",
    createdAt: "2026-02-10",
    fileStatus: "Amarillo",
  },
  {
    id: "o13",
    customerId: "c1",
    campaignName: "Prototypes",
    description: "Material testing for next season.",
    status: "Terminado",
    items: [
      { materialId: "m1", width: 30, height: 30, quantity: 5, finishing: [], doubleSided: false, suggestedUnitPrice: 0, unitPrice: 0, subtotal: 0, calculationBreakdown: { baseCost: 0, finishingMultiplier: 1, finishingAddons: 0 } },
    ],
    totalAmount: 50000,
    deliveryDate: "2026-01-05",
    createdAt: "2026-01-02",
    fileStatus: "Verde",
  },
  {
    id: "o14",
    customerId: "c3",
    campaignName: "Vehicle Wrap",
    description: "Full wrap for delivery van 03.",
    status: "Solicitud",
    items: [
      {
        materialId: "m5",
        width: 1500,
        height: 150,
        quantity: 1,
        finishing: ["Instalación"],
        doubleSided: false,
        suggestedUnitPrice: 0,
        unitPrice: 0,
        subtotal: 0,
        calculationBreakdown: { baseCost: 0, finishingMultiplier: 1, finishingAddons: 0 },
      },
    ],
    totalAmount: 0,
    deliveryDate: "",
    createdAt: "2026-02-12",
    fileStatus: "Rojo",
  },
  {
    id: "o15",
    customerId: "c5",
    campaignName: "Lobby Decor",
    description: "Abstract shapes for the hotel lobby.",
    status: "En Producción",
    items: [
      {
        materialId: "m3",
        width: 120,
        height: 240,
        quantity: 8,
        finishing: ["Corte Router"],
        doubleSided: false,
        suggestedUnitPrice: 0,
        unitPrice: 0,
        subtotal: 0,
        calculationBreakdown: { baseCost: 0, finishingMultiplier: 1, finishingAddons: 0 },
      },
    ],
    totalAmount: 1800000,
    deliveryDate: "2026-03-10",
    createdAt: "2026-02-09",
    fileStatus: "Verde",
  },
];
