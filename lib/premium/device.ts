"use client";

/**
 * Device identity for license binding.
 *
 * Stored in localStorage (not SQLite) so it's available immediately —
 * no need to wait for the async SQLite/WASM database to initialise.
 *
 * The ID is random and persistent across sessions, but resets if the user
 * clears site data or uses a different browser profile.
 * That tradeoff is fine for a UMKM app (re-binding via WA support).
 */

const DEVICE_ID_KEY = "aethera_device_id";

/** Short, human-readable random ID, e.g. "A7K-2Xq-9Fp". */
function generateId(): string {
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

/**
 * Get (or lazily create) this device's persistent ID.
 * Synchronous — safe to call anywhere on the client.
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
