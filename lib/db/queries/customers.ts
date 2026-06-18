import { execute, query, getDB, saveDB } from "../client";
import type { Customer } from "../types";

export async function getCustomers(includeInactive = false): Promise<Customer[]> {
  const where = includeInactive ? "" : "WHERE is_active = 1";
  return query<Customer>(`SELECT * FROM customers ${where} ORDER BY name ASC`);
}

export async function searchCustomers(term: string): Promise<Customer[]> {
  return query<Customer>(
    `SELECT * FROM customers WHERE is_active = 1 AND (name LIKE ? OR phone LIKE ?) ORDER BY name ASC LIMIT 8`,
    [`%${term}%`, `%${term}%`]
  );
}

export async function getCustomerById(id: number): Promise<Customer | null> {
  const rows = await query<Customer>("SELECT * FROM customers WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export interface CustomerWriteInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export async function createCustomer(input: CustomerWriteInput): Promise<number> {
  return execute(
    `INSERT INTO customers (name, phone, address, notes, is_active) VALUES (?, ?, ?, ?, ?)`,
    [input.name, input.phone ?? null, input.address ?? null, input.notes ?? null, input.isActive === false ? 0 : 1]
  );
}

export async function updateCustomer(id: number, input: CustomerWriteInput): Promise<void> {
  await execute(
    `UPDATE customers SET name = ?, phone = ?, address = ?, notes = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`,
    [input.name, input.phone ?? null, input.address ?? null, input.notes ?? null, input.isActive === false ? 0 : 1, id]
  );
}

export async function deleteCustomer(id: number): Promise<void> {
  const db = await getDB();
  db.run("DELETE FROM customers WHERE id = ?", [id]);
  await saveDB();
}

/** Bump total_spent after a sale */
export async function addCustomerSpend(customerId: number, amount: number): Promise<void> {
  await execute(
    `UPDATE customers SET total_spent = total_spent + ?, updated_at = datetime('now') WHERE id = ?`,
    [amount, customerId]
  );
}

/** History: all sales to a specific customer */
export async function getCustomerSaleHistory(
  customerId: number
): Promise<{ total_amount: number; count: number; last_at: string | null }> {
  const rows = await query<{ total_amount: number; count: number; last_at: string | null }>(
    `SELECT COALESCE(SUM(total_amount), 0) AS total_amount,
            COUNT(*) AS count,
            MAX(transaction_at) AS last_at
     FROM sales WHERE customer_id = ?`,
    [customerId]
  );
  return rows[0] ?? { total_amount: 0, count: 0, last_at: null };
}

/** Top customers by total spend */
export async function getTopCustomers(
  from: string,
  to: string,
  limit = 5
): Promise<{ customer_name: string; total: number; count: number }[]> {
  return query(
    `SELECT COALESCE(customer_name, 'Umum') AS customer_name,
            SUM(total_amount) AS total,
            COUNT(*) AS count
     FROM sales
     WHERE transaction_at BETWEEN ? AND ?
     GROUP BY customer_name
     ORDER BY total DESC LIMIT ?`,
    [from, to, limit]
  );
}
