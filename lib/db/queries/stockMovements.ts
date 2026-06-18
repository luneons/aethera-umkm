import { execute, query } from "../client";
import type { StockMovement, StockMovementReason } from "../types";

export async function recordStockMovement(input: {
  productId: number;
  delta: number;
  reason: StockMovementReason;
  refId?: number | null;
  notes?: string | null;
  stockAfter: number;
}): Promise<void> {
  await execute(
    `INSERT INTO stock_movements (product_id, delta, reason, ref_id, notes, stock_after)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.productId, input.delta, input.reason, input.refId ?? null, input.notes ?? null, input.stockAfter]
  );
}

export async function getStockMovements(
  productId: number,
  limit = 50
): Promise<StockMovement[]> {
  return query<StockMovement>(
    `SELECT sm.*, p.name AS product_name
     FROM stock_movements sm
     LEFT JOIN products p ON p.id = sm.product_id
     WHERE sm.product_id = ?
     ORDER BY sm.created_at DESC LIMIT ?`,
    [productId, limit]
  );
}

export async function getAllStockMovements(limit = 100): Promise<StockMovement[]> {
  return query<StockMovement>(
    `SELECT sm.*, p.name AS product_name
     FROM stock_movements sm
     LEFT JOIN products p ON p.id = sm.product_id
     ORDER BY sm.created_at DESC LIMIT ?`,
    [limit]
  );
}

export async function getRecentStockMovements(
  productId: number,
  limit = 10
): Promise<StockMovement[]> {
  return query<StockMovement>(
    `SELECT sm.*, p.name AS product_name
     FROM stock_movements sm
     LEFT JOIN products p ON p.id = sm.product_id
     WHERE sm.product_id = ?
     ORDER BY sm.created_at DESC LIMIT ?`,
    [productId, limit]
  );
}
