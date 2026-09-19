"use client";

const DEVICE_ID_KEY = "aethera_device_id";

/** Generate a short random ID. Falls back to Math.random if crypto is unavailable. */
function generateId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";

  try {
    // Prefer crypto.getRandomValues for better entropy
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    bytes.forEach((b, i) => {
      out += chars[b % chars.length];
      if (i === 2 || i === 5) out += "-";
    });
  } catch {
    // Fallback: Math.random (good enough for a device ID)
    for (let i = 0; i < 9; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
      if (i === 2 || i === 5) out += "-";
    }
  }

  return out;
}

/**
 * Get (or lazily create) this device's persistent ID from localStorage.
 * Returns empty string if localStorage is not accessible.
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id || id.length < 5) {
      id = generateId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    // localStorage blocked (e.g. Safari private mode, strict CSP)
    // Return a session-only ID so the page doesn't break
    if (!(window as { _aeDevId?: string })._aeDevId) {
      (window as { _aeDevId?: string })._aeDevId = generateId();
    }
    return (window as { _aeDevId?: string })._aeDevId ?? "";
  }
}
