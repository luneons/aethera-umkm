/**
 * Selling-price calculator for UMKM.
 * Given HPP (cost), desired margin %, and optional per-unit operational cost,
 * compute the recommended selling price.
 */
export interface PriceCalcInput {
  cost: number; // HPP per unit
  marginPercent: number; // desired profit margin on selling price OR markup
  operationalCost?: number; // extra per-unit cost
  mode?: "markup" | "margin"; // markup = % on cost; margin = % of selling price
}

export interface PriceCalcResult {
  sellingPrice: number;
  profit: number;
  totalCost: number;
  effectiveMargin: number; // % of selling price
}

export function calculateSellingPrice(input: PriceCalcInput): PriceCalcResult {
  const op = input.operationalCost ?? 0;
  const totalCost = input.cost + op;
  const mode = input.mode ?? "markup";
  const p = input.marginPercent / 100;

  let sellingPrice: number;
  if (mode === "margin") {
    // selling = cost / (1 - margin); guard against >= 100%
    const denom = Math.max(0.01, 1 - p);
    sellingPrice = totalCost / denom;
  } else {
    // markup on cost
    sellingPrice = totalCost * (1 + p);
  }
  sellingPrice = Math.round(sellingPrice);
  const profit = sellingPrice - totalCost;
  const effectiveMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  return { sellingPrice, profit, totalCost, effectiveMargin };
}
