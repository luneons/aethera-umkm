import { query, getDB, saveDB } from "../client";
import { toSqlDateTime } from "@/lib/utils/format";
import type { Database } from "sql.js";
import type { PaymentMethod, Purchase } from "../types";

export interface PurchaseWriteInput {
  productId: number | null;
  itemName: string;
  categoryId: number | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  discountAmount?: number;
  shippingFee?: number;
  supplier?: string | null;
  supplierId?: number | null;
  paymentMethod: PaymentMethod;
  channel?: string | null;
  notes?: string | null;
  transactionAt: Date | string;
  invoiceNumber?: string | null;
}

function normalizeDate(value: Date | string): string {
  return typeof value === "string" ? toSqlDateTime(new Date(value)) : toSqlDateTime(value);
}

function applyStockDeltaTx(
  db: Database,
  productId: number,
  delta: number,
  reason: string,
  refId: number | null,
  notes: string | null
): void {
  db.run(
    `UPDATE products SET stock = stock + ?, updated_at = datetime('now')
     WHERE id = ? AND track_stock = 1`,
    [delta, productId]
  );
  const rows = db.exec("SELECT stock, track_stock FROM products WHERE id = ?", [productId]);
  if (rows.length && rows[0].values.length && Number(rows[0].values[0][1]) === 1) {
    db.run(
      `INSERT INTO stock_movements (product_id, delta, reason, ref_id, notes, stock_after)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [productId, delta, reason, refId, notes, Number(rows[0].values[0][0])]
    );
  }
}

function insertPurchaseTx(db: Database, input: PurchaseWriteInput): number {
  db.run(
    `INSERT INTO purchases
       (product_id, item_name, category_id, quantity, unit_price, total_amount,
        discount_amount, shipping_fee, supplier, supplier_id, payment_method, channel, notes,
        transaction_at, invoice_number)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.productId,
      input.itemName,
      input.categoryId,
      input.quantity,
      input.unitPrice,
      input.totalAmount,
      input.discountAmount ?? 0,
      input.shippingFee ?? 0,
      input.supplier ?? null,
      input.supplierId ?? null,
      input.paymentMethod,
      input.channel ?? null,
      input.notes ?? null,
      normalizeDate(input.transactionAt),
      input.invoiceNumber ?? null,
    ]
  );
  const idRes = db.exec("SELECT last_insert_rowid() AS id");
  const id = Number(idRes[0].values[0][0]);
  if (input.productId) {
    applyStockDeltaTx(db, input.productId, Math.abs(input.quantity), "pembelian", id, null);
  }
  return id;
}

export async function createPurchase(input: PurchaseWriteInput): Promise<number> {
  const ids = await createPurchaseBatch([input]);
  return ids[0];
}

export async function createPurchaseBatch(items: PurchaseWriteInput[]): Promise<number[]> {
  const db = await getDB();
  db.exec("BEGIN IMMEDIATE");
  try {
    const ids = items.map((input) => insertPurchaseTx(db, input));
    db.exec("COMMIT");
    await saveDB();
    return ids;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export async function updatePurchase(id: number, input: PurchaseWriteInput): Promise<void> {
  const db = await getDB();
  const old = await getPurchaseById(id);
  if (!old) throw new Error("Transaksi pembelian tidak ditemukan");

  db.exec("BEGIN IMMEDIATE");
  try {
    db.run(
      `UPDATE purchases
       SET product_id = ?, item_name = ?, category_id = ?, quantity = ?, unit_price = ?,
           total_amount = ?, discount_amount = ?, shipping_fee = ?, supplier = ?, supplier_id = ?,
           payment_method = ?, channel = ?, notes = ?, transaction_at = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.productId,
        input.itemName,
        input.categoryId,
        input.quantity,
        input.unitPrice,
        input.totalAmount,
        input.discountAmount ?? 0,
        input.shippingFee ?? 0,
        input.supplier ?? null,
        input.supplierId ?? null,
        input.paymentMethod,
        input.channel ?? null,
        input.notes ?? null,
        normalizeDate(input.transactionAt),
        id,
      ]
    );
    if (old.product_id) {
      applyStockDeltaTx(db, old.product_id, -Math.abs(old.quantity), "adjustment", id, "Reversal edit pembelian");
    }
    if (input.productId) {
      applyStockDeltaTx(db, input.productId, Math.abs(input.quantity), "pembelian", id, null);
    }
    db.exec("COMMIT");
    await saveDB();
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export async function deletePurchase(id: number): Promise<void> {
  const db = await getDB();
  const old = await getPurchaseById(id);
  if (!old) return;

  db.exec("BEGIN IMMEDIATE");
  try {
    db.run("DELETE FROM purchases WHERE id = ?", [id]);
    if (old.product_id) {
      applyStockDeltaTx(db, old.product_id, -Math.abs(old.quantity), "adjustment", id, "Reversal hapus pembelian");
    }
    db.exec("COMMIT");
    await saveDB();
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export async function getPurchaseById(id: number): Promise<Purchase | null> {
  const rows = await query<Purchase>("SELECT * FROM purchases WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export interface PurchaseFilter {
  from?: string;
  to?: string;
  search?: string;
  sort?: "newest" | "oldest" | "amount_desc" | "amount_asc";
}

export async function getPurchases(filter: PurchaseFilter = {}): Promise<Purchase[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.from) {
    conditions.push("p.transaction_at >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push("p.transaction_at <= ?");
    params.push(filter.to);
  }
  if (filter.search) {
    conditions.push("(p.item_name LIKE ? OR p.supplier LIKE ? OR p.notes LIKE ?)");
    params.push(`%${filter.search}%`, `%${filter.search}%`, `%${filter.search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const order =
    filter.sort === "oldest"
      ? "p.transaction_at ASC"
      : filter.sort === "amount_desc"
      ? "p.total_amount DESC"
      : filter.sort === "amount_asc"
      ? "p.total_amount ASC"
      : "p.transaction_at DESC";

  return query<Purchase>(
    `SELECT p.*, c.name AS category_name
     FROM purchases p
     LEFT JOIN categories c ON c.id = p.category_id
     ${where}
     ORDER BY ${order}`,
    params
  );
}
