import { execute, query, getDB, saveDB } from "../client";

/** Generate next invoice number: INV/YYYY/XXXXXX */
export async function nextInvoiceNumber(prefix = "INV"): Promise<string> {
  const year = new Date().getFullYear();
  const db = await getDB();

  // Upsert counter
  db.run(
    `INSERT INTO invoice_counter (year, last_seq) VALUES (?, 1)
     ON CONFLICT(year) DO UPDATE SET last_seq = last_seq + 1`,
    [year]
  );
  await saveDB();

  const rows = await query<{ last_seq: number }>(
    "SELECT last_seq FROM invoice_counter WHERE year = ?",
    [year]
  );
  const seq = rows[0]?.last_seq ?? 1;
  return `${prefix}/${year}/${String(seq).padStart(5, "0")}`;
}

/** Generate purchase order number: PO/YYYY/XXXXX */
export async function nextPONumber(): Promise<string> {
  return nextInvoiceNumber("PO");
}
