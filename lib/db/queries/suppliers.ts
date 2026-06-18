import { execute, query, getDB, saveDB } from "../client";
import type { Supplier } from "../types";

export async function getSuppliers(includeInactive = false): Promise<Supplier[]> {
  const where = includeInactive ? "" : "WHERE is_active = 1";
  return query<Supplier>(`SELECT * FROM suppliers ${where} ORDER BY name ASC`);
}

export async function searchSuppliers(term: string): Promise<Supplier[]> {
  return query<Supplier>(
    `SELECT * FROM suppliers WHERE is_active = 1 AND name LIKE ? ORDER BY name ASC LIMIT 8`,
    [`%${term}%`]
  );
}

export async function getSupplierById(id: number): Promise<Supplier | null> {
  const rows = await query<Supplier>("SELECT * FROM suppliers WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export interface SupplierWriteInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export async function createSupplier(input: SupplierWriteInput): Promise<number> {
  return execute(
    `INSERT INTO suppliers (name, phone, address, notes, is_active) VALUES (?, ?, ?, ?, ?)`,
    [input.name, input.phone ?? null, input.address ?? null, input.notes ?? null, input.isActive === false ? 0 : 1]
  );
}

export async function updateSupplier(id: number, input: SupplierWriteInput): Promise<void> {
  await execute(
    `UPDATE suppliers SET name = ?, phone = ?, address = ?, notes = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`,
    [input.name, input.phone ?? null, input.address ?? null, input.notes ?? null, input.isActive === false ? 0 : 1, id]
  );
}

export async function deleteSupplier(id: number): Promise<void> {
  const db = await getDB();
  db.run("DELETE FROM suppliers WHERE id = ?", [id]);
  await saveDB();
}

/** History: all purchases from a specific supplier */
export async function getSupplierPurchaseHistory(
  supplierId: number
): Promise<{ total_amount: number; count: number; last_at: string | null }> {
  const rows = await query<{ total_amount: number; count: number; last_at: string | null }>(
    `SELECT COALESCE(SUM(total_amount), 0) AS total_amount,
            COUNT(*) AS count,
            MAX(transaction_at) AS last_at
     FROM purchases WHERE supplier_id = ?`,
    [supplierId]
  );
  return rows[0] ?? { total_amount: 0, count: 0, last_at: null };
}
