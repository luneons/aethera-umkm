import { execute, query, getDB, saveDB } from "../client";
import type { BusinessProfile } from "../types";

export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  const rows = await query<BusinessProfile>(
    "SELECT * FROM business_profile ORDER BY id ASC LIMIT 1"
  );
  return rows[0] ?? null;
}

export async function saveBusinessProfile(input: {
  name: string;
  type?: string | null;
  owner?: string | null;
  logoBase64?: string | null;
}): Promise<void> {
  const existing = await getBusinessProfile();
  if (existing) {
    await execute(
      `UPDATE business_profile
       SET name = ?, type = ?, owner = ?, logo_base64 = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [input.name, input.type ?? null, input.owner ?? null, input.logoBase64 ?? null, existing.id]
    );
  } else {
    await execute(
      "INSERT INTO business_profile (name, type, owner, logo_base64) VALUES (?, ?, ?, ?)",
      [input.name, input.type ?? null, input.owner ?? null, input.logoBase64 ?? null]
    );
  }
}

export async function getSetting(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = ?",
    [key]
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDB();
  db.run(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, value]
  );
  await saveDB();
}

export async function isOnboarded(): Promise<boolean> {
  const profile = await getBusinessProfile();
  return profile !== null;
}
