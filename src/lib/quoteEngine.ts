import type { OrderItem, Material, PricingConfig } from "../data/mockData";

export interface CalculatedItem extends OrderItem {
  suggestedUnitPrice: number;
  unitPrice: number;
  subtotal: number;
  warning?: string;
  calculationBreakdown: {
    baseCost: number;
    laborCost: number;
    finishingMultiplier: number;
    finishingAddons: number;
    segmentMultiplier: number;
    planchasUsed?: number;
  };
}

export interface QuoteResult {
  calculatedItems: CalculatedItem[];
  subtotal: number;
  despachoCost: number;
  installationFee: number;
  totalAmount: number;
}

/** Fallback material used when a materialId is not found in the materials array. */
const UNKNOWN_MATERIAL: Material = {
  id: "unknown",
  name: "Material Desconocido",
  type: "Flexible",
  stock: 0,
  unit: "u",
  supplier1Price: 0,
  supplier2Price: 0,
  supplier3Price: 0,
  activeSupplier: 1,
};

/** Clamp a number so it is never NaN or Infinity. Returns 0 for bad values. */
function safeNum(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n;
}

/**
 * Returns the effective price per unit for a material based on its activeSupplier.
 * "average" computes the mean of all non-zero supplier slots.
 */
export function getEffectivePrice(m: Material): number {
  if (m.activeSupplier === "average") {
    const slots = [m.supplier1Price, m.supplier2Price, m.supplier3Price].filter((p) => p > 0);
    return slots.length > 0 ? slots.reduce((a, b) => a + b, 0) / slots.length : 0;
  }
  if (m.activeSupplier === 1) return m.supplier1Price;
  if (m.activeSupplier === 2) return m.supplier2Price;
  return m.supplier3Price;
}

/**
 * Calculates price for a single order item using the segment-based formula:
 *   suggestedUnitPrice = Math.round((baseCost + laborCost) * finishingMultiplier + finishingAddons) * segmentMultiplier
 *
 * @param item - The order item
 * @param material - Resolved material (or UNKNOWN_MATERIAL fallback)
 * @param config - Pricing configuration
 * @param segmentMultiplier - Customer segment multiplier (A=2.2, B=2.0, C=1.8)
 * @param laborHoursPerItem - Labor hours allocated to this item (order.manHours / items.length)
 * @param weekendSurcharge - Whether weekend labor surcharge applies
 */
export function calculateItemPrice(
  item: OrderItem,
  material: Material,
  config: PricingConfig,
  segmentMultiplier: number = 2.0,
  laborHoursPerItem: number = 0,
  weekendSurcharge: boolean = false
): CalculatedItem {
  // Edge case: quantity <= 0 → default to 1
  const quantity = item.quantity > 0 ? item.quantity : 1;

  // Edge case: width or height is 0 → suggestedUnitPrice = 0 + warning
  if (item.width === 0 || item.height === 0) {
    return {
      ...item,
      quantity,
      suggestedUnitPrice: 0,
      unitPrice: 0,
      subtotal: 0,
      warning: "Medidas incompletas (ancho o alto = 0). Completar antes de cotizar.",
      calculationBreakdown: {
        baseCost: 0,
        laborCost: 0,
        finishingMultiplier: 1,
        finishingAddons: 0,
        segmentMultiplier,
      },
    };
  }

  const finishingMultiplier =
    item.finishing.length > 0
      ? Math.max(
          ...item.finishing.map(
            (f) => config.finishingMultipliers[f] ?? 1.0
          )
        )
      : 1.0;

  const finishingAddons = item.finishing.reduce(
    (sum, f) => sum + (config.finishingAddons[f] ?? 0),
    0
  );

  const effectivePrice = getEffectivePrice(material);
  let baseCost: number;
  let planchasUsed: number | undefined;

  // Determine effective unit mode. Older catalog rows may not have unitMode
  // set; fall back to the original "Flexible → per_m2, Rígido → per_plancha".
  const unitMode =
    material.unitMode ??
    (material.type === "Rígido" ? "per_plancha" : "per_m2");

  if (unitMode === "per_plancha") {
    // Rigid: workspace defined by sheetWidth/sheetHeight (cm), default 120×240.
    const sheetArea =
      (material.sheetWidth ?? 120) * (material.sheetHeight ?? 240);
    const pieceArea = item.width * item.height;
    planchasUsed = sheetArea > 0 ? safeNum(pieceArea / sheetArea) : 0;
    baseCost = safeNum(planchasUsed * effectivePrice);
  } else {
    // Flexible: derive CLP/m² then multiply by piece area in m².
    const areaM2 = (item.width * item.height) / 10000;
    let pricePerM2 = effectivePrice;
    if (unitMode === "per_roll") {
      const rollAreaM2 = (material.rollWidth ?? 0) * (material.rollLength ?? 0);
      pricePerM2 = rollAreaM2 > 0 ? effectivePrice / rollAreaM2 : effectivePrice;
    }
    baseCost = safeNum(areaM2 * pricePerM2);
  }
  if (item.doubleSided) baseCost *= 2;

  // Labor cost with optional weekend surcharge
  const laborRate = config.laborHourRate ?? 15000;
  const surchargeMultiplier = weekendSurcharge ? (config.weekendMultiplier ?? 1.25) : 1.0;
  const laborCost = safeNum(laborHoursPerItem * laborRate * surchargeMultiplier);

  // Segment-based pricing formula:
  // suggestedUnitPrice = round((baseCost + laborCost) * finishingMultiplier + finishingAddons) * segmentMultiplier
  let suggestedUnitPrice = Math.round(
    safeNum((baseCost + laborCost) * finishingMultiplier + finishingAddons) * segmentMultiplier
  );
  suggestedUnitPrice = Math.max(suggestedUnitPrice, material.minPrice ?? 0);
  const subtotal = safeNum(suggestedUnitPrice * quantity);

  return {
    ...item,
    quantity,
    suggestedUnitPrice,
    unitPrice: suggestedUnitPrice,
    subtotal,
    calculationBreakdown: {
      baseCost: safeNum(baseCost),
      laborCost: safeNum(laborCost),
      finishingMultiplier: safeNum(finishingMultiplier),
      finishingAddons: safeNum(finishingAddons),
      segmentMultiplier,
      ...(planchasUsed !== undefined ? { planchasUsed: safeNum(planchasUsed) } : {}),
    },
  };
}

export function calculateOrderQuote(
  items: OrderItem[],
  materials: Material[],
  config: PricingConfig,
  segmentMultiplier: number = 2.0,
  totalLaborHours: number = 0,
  weekendSurcharge: boolean = false,
  installationFee: number = 0
): QuoteResult {
  const materialMap = new Map(materials.map((m) => [m.id, m]));
  const itemCount = items.length > 0 ? items.length : 1;
  const laborHoursPerItem = totalLaborHours / itemCount;

  const calculatedItems = items.map((item) => {
    const material = materialMap.get(item.materialId) ?? UNKNOWN_MATERIAL;
    return calculateItemPrice(item, material, config, segmentMultiplier, laborHoursPerItem, weekendSurcharge);
  });

  const subtotal = safeNum(calculatedItems.reduce((sum, i) => sum + i.subtotal, 0));
  const despachoCost = safeNum(config.despachoCost);
  const safeInstallFee = safeNum(installationFee);
  const totalAmount = safeNum(subtotal + despachoCost + safeInstallFee);

  return { calculatedItems, subtotal, despachoCost, installationFee: safeInstallFee, totalAmount };
}

export function recalculateWithOverrides(
  quote: QuoteResult,
  overrides: { itemIndex: number; unitPrice: number }[]
): QuoteResult {
  const overrideMap = new Map(overrides.map((o) => [o.itemIndex, o.unitPrice]));

  const calculatedItems = quote.calculatedItems.map((item, idx) => {
    if (overrideMap.has(idx)) {
      const unitPrice = safeNum(overrideMap.get(idx)!);
      return {
        ...item,
        unitPrice,
        subtotal: safeNum(unitPrice * item.quantity),
      };
    }
    return item;
  });

  const subtotal = safeNum(calculatedItems.reduce((sum, i) => sum + i.subtotal, 0));
  const totalAmount = safeNum(subtotal + quote.despachoCost + quote.installationFee);

  return {
    calculatedItems,
    subtotal,
    despachoCost: quote.despachoCost,
    installationFee: quote.installationFee,
    totalAmount,
  };
}
