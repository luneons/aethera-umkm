import { execute, query, getDB, saveDB } from "../client";
import { toSqlDateTime } from "@/lib/utils/format";
import { adjustStock } from "./products";
import type { PaymentMethod, Sale } from "../types";

export interface SaleWriteInput {
  productId: number | null;
  productName: string;
  categoryId: number | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  channel?: string | null;
  notes?: string | null;
  transactionAt: Date | string;
  cashierId?: number | null;
  cashierName?: string | null;
}

function normalizeDate(value: Date | string): string {
  return typeof value === "string" ? toSqlDateTime(new Date(value)) : toSqlDateTime(value);
}

export async function createSale(input: SaleWriteInput): Promise<number> {
  const id = await execute(
    `INSERT INTO sales
       (product_id, product_name, category_id, quantity, unit_price, total_amount, payment_method, channel, notes, transaction_at, cashier_id, cashier_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.productId,
      input.productName,
      input.categoryId,
      input.quantity,
      input.unitPrice,
      input.totalAmount,
      input.paymentMethod,
      input.channel ?? null,
      input.notes ?? null,
      normalizeDate(input.transactionAt),
      input.cashierId ?? null,
      input.cashierName ?? null,
    ]
  );
  // Reduce stock on sale.
  if (input.productId) await adjustStock(input.productId, -Math.abs(input.quantity));
  return id;
}

export async function updateSale(id: number, input: SaleWriteInput): Promise<void> {
  await execute(
    `UPDATE sales
     SET product_id = ?, product_name = ?, category_id = ?, quantity = ?, unit_price = ?,
         total_amount = ?, payment_method = ?, channel = ?, notes = ?, transaction_at = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [
      input.productId,
      input.productName,
      input.categoryId,
      input.quantity,
      input.unitPrice,
      input.totalAmount,
      input.paymentMethod,
      input.channel ?? null,
      input.notes ?? null,
      normalizeDate(input.transactionAt),
      id,
    ]
  );
}

export async function deleteSale(id: number): Promise<void> {
  const db = await getDB();
  db.run("DELETE FROM sales WHERE id = ?", [id]);
  await saveDB();
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
