import { execute, query } from "../client";
import type { Achievement } from "../types";

export async function getUnlockedAchievements(): Promise<string[]> {
  const rows = await query<Achievement>("SELECT * FROM achievements");
  return rows.map((r) => r.code);
}

/** Unlock an achievement if not already unlocked. Returns true if newly unlocked. */
export async function unlockAchievement(code: string): Promise<boolean> {
  const existing = await query<{ c: number }>(
    "SELECT COUNT(*) AS c FROM achievements WHERE code = ?",
    [code]
  );
  if (Number(existing[0]?.c ?? 0) > 0) return false;
  await execute("INSERT INTO achievements (code) VALUES (?)", [code]);
  return true;
}
