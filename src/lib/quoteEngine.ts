import type { OrderItem, Material, PricingConfig } from "../data/mockData";

export interface CalculatedItem extends OrderItem {
  suggestedUnitPrice: number;
  unitPrice: number;
  subtotal: number;
  warning?: string;
  calculationBreakdown: {
    baseCost: number;
    finishingMultiplier: number;
    finishingAddons: number;
    planchasUsed?: number;
  };
}

export interface QuoteResult {
  calculatedItems: CalculatedItem[];
  subtotal: number;
  despachoCost: number;
  totalAmount: number;
}

/** Fallback material used when a materialId is not found in the materials array. */
const UNKNOWN_MATERIAL: Material = {
  id: "unknown",
  name: "Material Desconocido",
  type: "Flexible",
  stock: 0,
  unit: "u",
  pricePerUnit: 0,
};

/** Clamp a number so it is never NaN or Infinity. Returns 0 for bad values. */
function safeNum(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n;
}

export function calculateItemPrice(
  item: OrderItem,
  material: Material,
  config: PricingConfig
): CalculatedItem {
  // —— Edge case: quantity <= 0 → default to 1 ——
  const quantity = item.quantity > 0 ? item.quantity : 1;

  // —— Edge case: width or height is 0 → suggestedUnitPrice = 0 + warning ——
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
        finishingMultiplier: 1,
        finishingAddons: 0,
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

  let baseCost: number;
  let planchasUsed: number | undefined;

  if (material.type === "Flexible") {
    const areaM2 = (item.width * item.height) / 10000;
    baseCost = safeNum(areaM2 * material.pricePerUnit);
    if (item.doubleSided) baseCost *= 2;
  } else {
    const sheetArea =
      (material.sheetWidth ?? 122) * (material.sheetHeight ?? 244);
    const pieceArea = item.width * item.height;
    planchasUsed = sheetArea > 0 ? safeNum(pieceArea / sheetArea) : 0;
    baseCost = safeNum(
      planchasUsed * material.pricePerUnit * (1 + config.rigidMargin)
    );
    if (item.doubleSided) baseCost *= 2;
  }

  let suggestedUnitPrice = Math.round(
    safeNum(baseCost * finishingMultiplier + finishingAddons)
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
      finishingMultiplier: safeNum(finishingMultiplier),
      finishingAddons: safeNum(finishingAddons),
      ...(planchasUsed !== undefined ? { planchasUsed: safeNum(planchasUsed) } : {}),
    },
  };
}

export function calculateOrderQuote(
  items: OrderItem[],
  materials: Material[],
  config: PricingConfig
): QuoteResult {
  const materialMap = new Map(materials.map((m) => [m.id, m]));

  const calculatedItems = items.map((item) => {
    // —— Edge case: materialId not found → use fallback material ——
    const material = materialMap.get(item.materialId) ?? UNKNOWN_MATERIAL;
    return calculateItemPrice(item, material, config);
  });

  const subtotal = safeNum(calculatedItems.reduce((sum, i) => sum + i.subtotal, 0));
  const despachoCost = safeNum(config.despachoCost);
  const totalAmount = safeNum(subtotal + despachoCost);

  return { calculatedItems, subtotal, despachoCost, totalAmount };
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
  const totalAmount = safeNum(subtotal + quote.despachoCost);

  return {
    calculatedItems,
    subtotal,
    despachoCost: quote.despachoCost,
    totalAmount,
  };
}
