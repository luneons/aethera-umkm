"use client";

import { getSetting, setSetting } from "@/lib/db/queries/settings";

/**
 * Device identity for license binding.
 *
 * Each device generates a random, persistent Device ID on first access.
 * A license key can be bound to a specific Device ID so that sharing the key
 * to another device will fail validation.
 *
 * The ID is stored in app_settings (inside the SQLite DB persisted to IndexedDB).
 * It is NOT a hardware fingerprint — it's a random value, so it survives across
 * sessions but resets if the user clears site data / reinstalls. That tradeoff
 * is acceptable for a UMKM app (re-binding handled via WA support).
 */

const DEVICE_ID_SETTING = "device_id";

/** Short, human-friendly random ID, e.g. "A7K2-9XQm-3FpL". */
function randomDeviceId(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  bytes.forEach((b, i) => {
    out += chars[b % chars.length];
    if (i === 2 || i === 5) out += "-";
  });
  return out;
}

/** Get (or lazily create) this device's persistent ID. */
export async function getDeviceId(): Promise<string> {
  let id = await getSetting(DEVICE_ID_SETTING);
  if (!id) {
    id = randomDeviceId();
    await setSetting(DEVICE_ID_SETTING, id);
  }
  return id;
}
