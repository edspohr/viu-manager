import { describe, it, expect } from "vitest";
import {
  calculateItemPrice,
  calculateOrderQuote,
  recalculateWithOverrides,
  getEffectivePrice,
} from "./quoteEngine";
import { initialPricingConfig } from "../data/mockData";
import type { Material, OrderItem } from "../data/mockData";

// --- Shared fixtures ---

const blankBreakdown = {
  baseCost: 0,
  laborCost: 0,
  finishingMultiplier: 1,
  finishingAddons: 0,
  segmentMultiplier: 1,
};

function makeItem(partial: Partial<OrderItem> & Pick<OrderItem, "materialId" | "width" | "height" | "quantity">): OrderItem {
  return {
    finishing: [],
    doubleSided: false,
    suggestedUnitPrice: 0,
    unitPrice: 0,
    subtotal: 0,
    calculationBreakdown: blankBreakdown,
    ...partial,
  };
}

const adhesivoBLACK: Material = {
  id: "m6",
  name: "Adhesivo Black Out Matte",
  type: "Flexible",
  stock: 300,
  unit: "m",
  supplier1Price: 7770,
  supplier2Price: 0,
  supplier3Price: 0,
  activeSupplier: 1,
};

const adhesivoMATTE: Material = {
  id: "m5",
  name: "Adhesivo Laminado Matte",
  type: "Flexible",
  stock: 500,
  unit: "m",
  supplier1Price: 9000,
  supplier2Price: 0,
  supplier3Price: 0,
  activeSupplier: 1,
};

// 120×240 workspace (§3.3)
const fomex5MM: Material = {
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
};

// Use segmentMultiplier=1.0 and no labor for simple baseline calculations
const SEG = 1.0;

// --- Tests ---

describe("getEffectivePrice", () => {
  it("returns supplier1Price when activeSupplier is 1", () => {
    expect(getEffectivePrice(fomex5MM)).toBe(15000);
  });

  it("returns average of non-zero slots when activeSupplier is 'average'", () => {
    const m: Material = { ...adhesivoMATTE, supplier1Price: 9000, supplier2Price: 6000, supplier3Price: 0, activeSupplier: "average" };
    expect(getEffectivePrice(m)).toBe(7500);
  });

  it("returns supplier2Price when activeSupplier is 2", () => {
    const m: Material = { ...adhesivoMATTE, supplier2Price: 8500, activeSupplier: 2 };
    expect(getEffectivePrice(m)).toBe(8500);
  });
});

describe("calculateItemPrice", () => {
  it("Test 1 — Flexible: Adhesivo Black Out 245×245cm ×1 (segMult=1.0) → ~46,639 CLP (±5%)", () => {
    const item = makeItem({
      materialId: "m6",
      width: 245,
      height: 245,
      quantity: 1,
      finishing: ["Corte Recto"],
    });

    const result = calculateItemPrice(item, adhesivoBLACK, initialPricingConfig, SEG);

    // areaM2 = (245*245)/10000 = 6.0025
    // baseCost = 6.0025 * 7770 = 46,639
    // laborCost = 0
    // multiplier = 1.0 (Corte Recto), addons = 0
    // suggestedUnitPrice = round(46639 * 1.0 + 0) * 1.0 = 46,639
    const expected = Math.round(6.0025 * 7770);
    expect(result.suggestedUnitPrice).toBeGreaterThan(expected * 0.95);
    expect(result.suggestedUnitPrice).toBeLessThan(expected * 1.05);
  });

  it("Test 2 — Flexible: Adhesivo Laminado Matte 200×51cm ×2 (segMult=1.0) → ~9,180 CLP unit (±5%)", () => {
    const item = makeItem({
      materialId: "m5",
      width: 200,
      height: 51,
      quantity: 2,
      finishing: [],
    });

    const result = calculateItemPrice(item, adhesivoMATTE, initialPricingConfig, SEG);

    // areaM2 = (200*51)/10000 = 1.02
    // baseCost = 1.02 * 9000 = 9,180
    // suggestedUnitPrice = round(9180 * 1.0) * 1.0 = 9,180
    const expected = Math.round(1.02 * 9000);
    expect(result.suggestedUnitPrice).toBeGreaterThan(expected * 0.95);
    expect(result.suggestedUnitPrice).toBeLessThan(expected * 1.05);
    expect(result.subtotal).toBe(result.suggestedUnitPrice * 2);
  });

  it("Test 3 — Rigid: Fomex 5MM 200×60cm ×4, Corte Recto → planchasUsed correct for 120×240", () => {
    const item = makeItem({
      materialId: "m1",
      width: 200,
      height: 60,
      quantity: 4,
      finishing: ["Corte Recto"],
    });

    const result = calculateItemPrice(item, fomex5MM, initialPricingConfig, SEG);

    // sheetArea = 120*240 = 28,800 cm²
    // pieceArea = 200*60 = 12,000 cm²
    // planchasUsed = 12000/28800 = 0.41667
    expect(result.calculationBreakdown.planchasUsed).toBeCloseTo(12000 / 28800, 4);
    expect(result.suggestedUnitPrice).toBeGreaterThan(1500); // at least minPrice
  });

  it("Test 4 — Rigid with Troquelado: Fomex 5MM 120×31cm ×2 → suggestedUnitPrice > base * 1.5", () => {
    const itemRecto = makeItem({
      materialId: "m1",
      width: 120,
      height: 31,
      quantity: 2,
      finishing: ["Corte Recto"],
    });
    const itemTroquelado = makeItem({
      materialId: "m1",
      width: 120,
      height: 31,
      quantity: 2,
      finishing: ["Troquelado"],
    });

    const baseResult = calculateItemPrice(itemRecto, fomex5MM, initialPricingConfig, SEG);
    const troqueladoResult = calculateItemPrice(itemTroquelado, fomex5MM, initialPricingConfig, SEG);

    // Troquelado multiplier = 1.5× applied before segment multiplier
    expect(troqueladoResult.suggestedUnitPrice).toBeGreaterThanOrEqual(
      Math.round(baseResult.suggestedUnitPrice * 1.5) - 1
    );
    expect(troqueladoResult.calculationBreakdown.finishingMultiplier).toBe(1.5);
  });

  it("Test 5 — minPrice floor: Fomex small 10×10cm ×1 → suggestedUnitPrice === minPrice (1500)", () => {
    const item = makeItem({
      materialId: "m1",
      width: 10,
      height: 10,
      quantity: 1,
      finishing: [],
    });

    const result = calculateItemPrice(item, fomex5MM, initialPricingConfig, SEG);

    // pieceArea = 100 cm², planchasUsed tiny → hits minPrice floor
    expect(result.suggestedUnitPrice).toBe(fomex5MM.minPrice);
  });

  it("Test 6 — segment multiplier B (2.0) doubles price vs multiplier 1.0", () => {
    const item = makeItem({
      materialId: "m5",
      width: 100,
      height: 100,
      quantity: 1,
      finishing: [],
    });

    const base = calculateItemPrice(item, adhesivoMATTE, initialPricingConfig, 1.0);
    const segB = calculateItemPrice(item, adhesivoMATTE, initialPricingConfig, 2.0);

    expect(segB.suggestedUnitPrice).toBe(base.suggestedUnitPrice * 2);
    expect(segB.calculationBreakdown.segmentMultiplier).toBe(2.0);
  });
});

describe("recalculateWithOverrides", () => {
  it("Test 7 — override item[0].unitPrice = 99999, verify total reflects it and suggestedUnitPrice is unchanged", () => {
    const item1 = makeItem({ materialId: "m5", width: 100, height: 100, quantity: 1 });
    const item2 = makeItem({ materialId: "m5", width: 50, height: 50, quantity: 2 });

    const quote = calculateOrderQuote(
      [item1, item2],
      [adhesivoMATTE],
      initialPricingConfig,
      1.0
    );

    const originalSuggested = quote.calculatedItems[0].suggestedUnitPrice;

    const updated = recalculateWithOverrides(quote, [
      { itemIndex: 0, unitPrice: 99999 },
    ]);

    expect(updated.calculatedItems[0].unitPrice).toBe(99999);
    expect(updated.calculatedItems[0].subtotal).toBe(99999 * 1);
    expect(updated.calculatedItems[0].suggestedUnitPrice).toBe(originalSuggested);
    expect(updated.totalAmount).toBe(
      99999 + quote.calculatedItems[1].subtotal + initialPricingConfig.despachoCost
    );
  });
});
