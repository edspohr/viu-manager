export interface Customer {
  id: string;
  name: string;
  type: "Complejo" | "Recurrente" | "Esporádico";
  contact: string;
  debt: number;
}

export interface Material {
  id: string;
  name: string; // Spanish for UI consistency
  type: "Rígido" | "Flexible";
  stock: number;
  unit: string;
  pricePerUnit: number;
}

export interface OrderItem {
  materialId: string;
  width: number;
  height: number;
  quantity: number;
  finishing: string[];
}

export interface Order {
  id: string;
  customerId: string;
  campaignName: string; // English
  description: string; // English (simulating raw input)
  status:
    | "Solicitud"
    | "Por Aprobar"
    | "En Producción"
    | "Despacho"
    | "Terminado"; // Spanish Columns
  items: OrderItem[];
  totalAmount: number;
  deliveryDate: string;
  createdAt: string;
  fileStatus: "Rojo" | "Amarillo" | "Verde"; // File readiness
}

export interface PricingConfig {
  foamPrice: number;
  vinylPrice: number;
  laborCostPerHour: number;
  margin: number;
}

export const initialPricingConfig: PricingConfig = {
  foamPrice: 15000,
  vinylPrice: 5000,
  laborCostPerHour: 25000,
  margin: 0.35,
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
    pricePerUnit: 15000,
  },
  {
    id: "m2",
    name: "Sintra 3MM (PVC)",
    type: "Rígido",
    stock: 85,
    unit: "planchas",
    pricePerUnit: 12000,
  },
  {
    id: "m3",
    name: "Sintra 5MM (PVC)",
    type: "Rígido",
    stock: 40,
    unit: "planchas",
    pricePerUnit: 18000,
  },
  {
    id: "m4",
    name: "PP Alveolar 6MM",
    type: "Rígido",
    stock: 200,
    unit: "planchas",
    pricePerUnit: 8000,
  },
  {
    id: "m5",
    name: "Adhesivo Laminado",
    type: "Flexible",
    stock: 500,
    unit: "m",
    pricePerUnit: 4500,
  },
  {
    id: "m6",
    name: "Vinilo Blanco Plotter",
    type: "Flexible",
    stock: 300,
    unit: "m",
    pricePerUnit: 3800,
  },
  {
    id: "m7",
    name: "Tela PVC",
    type: "Flexible",
    stock: 150,
    unit: "m",
    pricePerUnit: 6000,
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
      { materialId: "m2", width: 60, height: 90, quantity: 10, finishing: [] },
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
      { materialId: "m4", width: 90, height: 210, quantity: 10, finishing: [] },
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
      { materialId: "m4", width: 50, height: 70, quantity: 100, finishing: [] },
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
      { materialId: "m1", width: 30, height: 30, quantity: 5, finishing: [] },
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
      },
    ],
    totalAmount: 1800000,
    deliveryDate: "2026-03-10",
    createdAt: "2026-02-09",
    fileStatus: "Verde",
  },
];
