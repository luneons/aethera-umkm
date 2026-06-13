import { execute, query, getDB, saveDB } from "../client";
import { toSqlDateTime } from "@/lib/utils/format";
import type { Recurring, TxKind, PaymentMethod } from "../types";

export interface RecurringWriteInput {
  kind: TxKind;
  name: string;
  categoryId: number | null;
  quantity: number;
  unitPrice: number;
  paymentMethod: PaymentMethod;
  channel?: string | null;
  notes?: string | null;
  frequency: "harian" | "mingguan" | "bulanan";
  nextRun: Date | string;
}

function normDate(value: Date | string): string {
  return typeof value === "string" ? toSqlDateTime(new Date(value)) : toSqlDateTime(value);
}

export async function getRecurring(): Promise<Recurring[]> {
  return query<Recurring>("SELECT * FROM recurring ORDER BY next_run ASC");
}

export async function getDueRecurring(): Promise<Recurring[]> {
  return query<Recurring>(
    "SELECT * FROM recurring WHERE is_active = 1 AND next_run <= datetime('now') ORDER BY next_run ASC"
  );
}

export async function createRecurring(input: RecurringWriteInput): Promise<number> {
  return execute(
    `INSERT INTO recurring
       (kind, name, category_id, quantity, unit_price, payment_method, channel, notes, frequency, next_run)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.kind,
      input.name,
      input.categoryId,
      input.quantity,
      input.unitPrice,
      input.paymentMethod,
      input.channel ?? null,
      input.notes ?? null,
      input.frequency,
      normDate(input.nextRun),
    ]
  );
}

export async function updateRecurring(id: number, input: RecurringWriteInput): Promise<void> {
  await execute(
    `UPDATE recurring
     SET kind = ?, name = ?, category_id = ?, quantity = ?, unit_price = ?,
         payment_method = ?, channel = ?, notes = ?, frequency = ?, next_run = ?
     WHERE id = ?`,
    [
      input.kind,
      input.name,
      input.categoryId,
      input.quantity,
      input.unitPrice,
      input.paymentMethod,
      input.channel ?? null,
      input.notes ?? null,
      input.frequency,
      normDate(input.nextRun),
      id,
    ]
  );
}

export async function setRecurringActive(id: number, active: boolean): Promise<void> {
  await execute("UPDATE recurring SET is_active = ? WHERE id = ?", [active ? 1 : 0, id]);
}

/** Advance next_run by one frequency step. */
export async function advanceRecurring(id: number, frequency: string, from: Date): Promise<void> {
  const next = new Date(from);
  if (frequency === "harian") next.setDate(next.getDate() + 1);
  else if (frequency === "mingguan") next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  await execute("UPDATE recurring SET next_run = ? WHERE id = ?", [normDate(next), id]);
}

export async function deleteRecurring(id: number): Promise<void> {
  const db = await getDB();
  db.run("DELETE FROM recurring WHERE id = ?", [id]);
  await saveDB();
}
