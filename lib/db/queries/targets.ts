import { execute, query, getDB, saveDB } from "../client";
import type { Target } from "../types";

export async function getTarget(period: "harian" | "bulanan"): Promise<Target | null> {
  const rows = await query<Target>(
    "SELECT * FROM targets WHERE period = ? ORDER BY id DESC LIMIT 1",
    [period]
  );
  return rows[0] ?? null;
}

export async function getTargets(): Promise<Target[]> {
  return query<Target>("SELECT * FROM targets ORDER BY period ASC");
}

export async function setTarget(period: "harian" | "bulanan", amount: number): Promise<void> {
  const existing = await getTarget(period);
  if (existing) {
    await execute(
      "UPDATE targets SET amount = ?, updated_at = datetime('now') WHERE id = ?",
      [amount, existing.id]
    );
  } else {
    await execute("INSERT INTO targets (period, amount) VALUES (?, ?)", [period, amount]);
  }
}

export async function deleteTarget(period: "harian" | "bulanan"): Promise<void> {
  const db = await getDB();
  db.run("DELETE FROM targets WHERE period = ?", [period]);
  await saveDB();
}
