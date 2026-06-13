import { execute, query, getDB, saveDB } from "../client";
import type { Product } from "../types";

export async function getProducts(includeInactive = true): Promise<Product[]> {
  const where = includeInactive ? "" : "WHERE is_active = 1";
  return query<Product>(
    `SELECT * FROM products ${where} ORDER BY name ASC`
  );
}

export async function searchActiveProducts(term: string): Promise<Product[]> {
  return query<Product>(
    `SELECT * FROM products
     WHERE is_active = 1 AND name LIKE ?
     ORDER BY name ASC LIMIT 8`,
    [`%${term}%`]
  );
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const rows = await query<Product>(
    "SELECT * FROM products WHERE barcode = ? LIMIT 1",
    [barcode]
  );
  return rows[0] ?? null;
}

export async function getLowStockProducts(): Promise<Product[]> {
  return query<Product>(
    `SELECT * FROM products
     WHERE is_active = 1 AND track_stock = 1 AND stock <= low_stock_threshold
     ORDER BY stock ASC`
  );
}

export interface ProductWriteInput {
  name: string;
  categoryId: number | null;
  sellPrice: number;
  buyPrice: number;
  unit: string;
  description?: string | null;
  isActive?: boolean;
  stock?: number;
  trackStock?: boolean;
  lowStockThreshold?: number;
  barcode?: string | null;
}

export async function createProduct(input: ProductWriteInput): Promise<number> {
  return execute(
    `INSERT INTO products
       (name, category_id, sell_price, buy_price, unit, description, is_active, stock, track_stock, low_stock_threshold, barcode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.categoryId,
      input.sellPrice,
      input.buyPrice,
      input.unit,
      input.description ?? null,
      input.isActive === false ? 0 : 1,
      input.stock ?? 0,
      input.trackStock ? 1 : 0,
      input.lowStockThreshold ?? 0,
      input.barcode || null,
    ]
  );
}

export async function updateProduct(
  id: number,
  input: ProductWriteInput
): Promise<void> {
  await execute(
    `UPDATE products
     SET name = ?, category_id = ?, sell_price = ?, buy_price = ?, unit = ?,
         description = ?, is_active = ?, stock = ?, track_stock = ?,
         low_stock_threshold = ?, barcode = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      input.name,
      input.categoryId,
      input.sellPrice,
      input.buyPrice,
      input.unit,
      input.description ?? null,
      input.isActive === false ? 0 : 1,
      input.stock ?? 0,
      input.trackStock ? 1 : 0,
      input.lowStockThreshold ?? 0,
      input.barcode || null,
      id,
    ]
  );
}

export async function deleteProduct(id: number): Promise<void> {
  const db = await getDB();
  db.run("DELETE FROM products WHERE id = ?", [id]);
  await saveDB();
}

/**
 * Adjust stock for a product that tracks stock.
 * delta negative = reduce (sale), positive = add (purchase/restock).
 */
export async function adjustStock(productId: number, delta: number): Promise<void> {
  const db = await getDB();
  db.run(
    `UPDATE products
     SET stock = stock + ?, updated_at = datetime('now')
     WHERE id = ? AND track_stock = 1`,
    [delta, productId]
  );
  await saveDB();
}
