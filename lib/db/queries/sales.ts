import { query, getDB, saveDB } from "../client";
import { toSqlDateTime } from "@/lib/utils/format";
import type { Database } from "sql.js";
import type { PaymentMethod, Sale } from "../types";

export interface SaleWriteInput {
  productId: number | null;
  productName: string;
  categoryId: number | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  discountAmount?: number;
  shippingFee?: number;
  paymentMethod: PaymentMethod;
  channel?: string | null;
  notes?: string | null;
  transactionAt: Date | string;
  cashierId?: number | null;
  cashierName?: string | null;
  customerId?: number | null;
  customerName?: string | null;
  invoiceNumber?: string | null;
}

function normalizeDate(value: Date | string): string {
  return typeof value === "string" ? toSqlDateTime(new Date(value)) : toSqlDateTime(value);
}

/** Apply a stock delta inside an open transaction (no saveDB). */
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
  const rows = db.exec(
    "SELECT stock, track_stock FROM products WHERE id = ?",
    [productId]
  );
  if (rows.length && rows[0].values.length) {
    const stock = Number(rows[0].values[0][0]);
    const trackStock = Number(rows[0].values[0][1]);
    if (trackStock === 1) {
      db.run(
        `INSERT INTO stock_movements (product_id, delta, reason, ref_id, notes, stock_after)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [productId, delta, reason, refId, notes, stock]
      );
    }
  }
}

/** Adjust customer total_spent inside an open transaction. */
function applyCustomerSpendTx(db: Database, customerId: number, amount: number): void {
  db.run(
    `UPDATE customers SET total_spent = total_spent + ?, updated_at = datetime('now') WHERE id = ?`,
    [amount, customerId]
  );
}

export async function createSale(input: SaleWriteInput): Promise<number> {
  const db = await getDB();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.run(
      `INSERT INTO sales
         (product_id, product_name, category_id, quantity, unit_price, total_amount,
          discount_amount, shipping_fee, payment_method, channel, notes, transaction_at,
          cashier_id, cashier_name, customer_id, customer_name, invoice_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.productId,
        input.productName,
        input.categoryId,
        input.quantity,
        input.unitPrice,
        input.totalAmount,
        input.discountAmount ?? 0,
        input.shippingFee ?? 0,
        input.paymentMethod,
        input.channel ?? null,
        input.notes ?? null,
        normalizeDate(input.transactionAt),
        input.cashierId ?? null,
        input.cashierName ?? null,
        input.customerId ?? null,
        input.customerName ?? null,
        input.invoiceNumber ?? null,
      ]
    );
    const idRes = db.exec("SELECT last_insert_rowid() AS id");
    const id = Number(idRes[0].values[0][0]);
    if (input.productId) {
      applyStockDeltaTx(db, input.productId, -Math.abs(input.quantity), "penjualan", id, null);
    }
    if (input.customerId) {
      applyCustomerSpendTx(db, input.customerId, input.totalAmount);
    }
    db.exec("COMMIT");
    await saveDB();
    return id;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export async function createSaleBatch(items: SaleWriteInput[]): Promise<number[]> {
  const db = await getDB();
  db.exec("BEGIN IMMEDIATE");
  const ids: number[] = [];
  try {
    for (const input of items) {
      db.run(
        `INSERT INTO sales
           (product_id, product_name, category_id, quantity, unit_price, total_amount,
            discount_amount, shipping_fee, payment_method, channel, notes, transaction_at,
            cashier_id, cashier_name, customer_id, customer_name, invoice_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.productId,
          input.productName,
          input.categoryId,
          input.quantity,
          input.unitPrice,
          input.totalAmount,
          input.discountAmount ?? 0,
          input.shippingFee ?? 0,
          input.paymentMethod,
          input.channel ?? null,
          input.notes ?? null,
          normalizeDate(input.transactionAt),
          input.cashierId ?? null,
          input.cashierName ?? null,
          input.customerId ?? null,
          input.customerName ?? null,
          input.invoiceNumber ?? null,
        ]
      );
      const idRes = db.exec("SELECT last_insert_rowid() AS id");
      const id = Number(idRes[0].values[0][0]);
      ids.push(id);
      if (input.productId) {
        applyStockDeltaTx(db, input.productId, -Math.abs(input.quantity), "penjualan", id, null);
      }
      if (input.customerId) {
        applyCustomerSpendTx(db, input.customerId, input.totalAmount);
      }
    }
    db.exec("COMMIT");
    await saveDB();
    return ids;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export async function updateSale(id: number, input: SaleWriteInput): Promise<void> {
  const db = await getDB();
  const oldRows = db.exec("SELECT * FROM sales WHERE id = ?", [id]);
  if (!oldRows.length || !oldRows[0].values.length) {
    throw new Error("Transaksi tidak ditemukan");
  }
  const old = oldRows[0];
  const cols = old.columns;
  const row = old.values[0];
  const get = (name: string) => row[cols.indexOf(name)];
  const oldProductId = get("product_id") as number | null;
  const oldQty = Number(get("quantity"));
  const oldCustomerId = get("customer_id") as number | null;
  const oldTotal = Number(get("total_amount"));

  db.exec("BEGIN IMMEDIATE");
  try {
    db.run(
      `UPDATE sales
       SET product_id = ?, product_name = ?, category_id = ?, quantity = ?, unit_price = ?,
           total_amount = ?, discount_amount = ?, shipping_fee = ?, payment_method = ?,
           channel = ?, notes = ?, transaction_at = ?, customer_id = ?, customer_name = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.productId,
        input.productName,
        input.categoryId,
        input.quantity,
        input.unitPrice,
        input.totalAmount,
        input.discountAmount ?? 0,
        input.shippingFee ?? 0,
        input.paymentMethod,
        input.channel ?? null,
        input.notes ?? null,
        normalizeDate(input.transactionAt),
        input.customerId ?? null,
        input.customerName ?? null,
        id,
      ]
    );

    // Reverse old stock effect, then apply new one.
    if (oldProductId) {
      applyStockDeltaTx(db, oldProductId, Math.abs(oldQty), "adjustment", id, "Reversal edit penjualan");
    }
    if (input.productId) {
      applyStockDeltaTx(db, input.productId, -Math.abs(input.quantity), "penjualan", id, null);
    }

    // Reverse old customer spend, then apply new one.
    if (oldCustomerId) {
      applyCustomerSpendTx(db, oldCustomerId, -oldTotal);
    }
    if (input.customerId) {
      applyCustomerSpendTx(db, input.customerId, input.totalAmount);
    }

    db.exec("COMMIT");
    await saveDB();
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export async function deleteSale(id: number): Promise<void> {
  const db = await getDB();
  const oldRows = db.exec("SELECT * FROM sales WHERE id = ?", [id]);
  if (!oldRows.length || !oldRows[0].values.length) return;
  const old = oldRows[0];
  const cols = old.columns;
  const row = old.values[0];
  const get = (name: string) => row[cols.indexOf(name)];
  const productId = get("product_id") as number | null;
  const qty = Number(get("quantity"));
  const customerId = get("customer_id") as number | null;
  const total = Number(get("total_amount"));

  db.exec("BEGIN IMMEDIATE");
  try {
    db.run("DELETE FROM sales WHERE id = ?", [id]);
    if (productId) {
      applyStockDeltaTx(db, productId, Math.abs(qty), "adjustment", id, "Reversal hapus penjualan");
    }
    if (customerId) {
      applyCustomerSpendTx(db, customerId, -total);
    }
    db.exec("COMMIT");
    await saveDB();
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export async function getSaleById(id: number): Promise<Sale | null> {
  const rows = await query<Sale>("SELECT * FROM sales WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export interface SaleFilter {
  from?: string; // sql datetime
  to?: string;
  search?: string;
  sort?: "newest" | "oldest" | "amount_desc" | "amount_asc";
}

export async function getSales(filter: SaleFilter = {}): Promise<Sale[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.from) {
    conditions.push("s.transaction_at >= ?");
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push("s.transaction_at <= ?");
    params.push(filter.to);
  }
  if (filter.search) {
    conditions.push("(s.product_name LIKE ? OR s.notes LIKE ?)");
    params.push(`%${filter.search}%`, `%${filter.search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const order =
    filter.sort === "oldest"
      ? "s.transaction_at ASC"
      : filter.sort === "amount_desc"
      ? "s.total_amount DESC"
      : filter.sort === "amount_asc"
      ? "s.total_amount ASC"
      : "s.transaction_at DESC";

  return query<Sale>(
    `SELECT s.*, c.name AS category_name
     FROM sales s
     LEFT JOIN categories c ON c.id = s.category_id
     ${where}
     ORDER BY ${order}`,
    params
  );
}
