"use client";

import { getSetting, setSetting } from "@/lib/db/queries/settings";

/**
 * Premium licensing (offline, "soft" gate).
 *
 * A license key is a base64url string: `payload.signature` where
 *   payload   = JSON { name, plan, exp } base64url-encoded
 *   signature = HMAC-SHA256(payload, APP_SECRET) base64url, truncated
 *
 * NOTE: Because the secret ships in the client bundle, this is a soft gate
 * suitable for a freemium UMKM app (deters casual bypass, not determined users).
 * For hard enforcement, validate against a licensing server.
 */

const APP_SECRET = "aethera-umkm-2026-premium"; // shared, non-sensitive soft-gate secret
const LICENSE_SETTING = "premium_license";

export interface LicensePayload {
  name: string; // licensee / business name
  plan: "premium";
  exp: number | null; // epoch ms, null = lifetime
}

export interface LicenseStatus {
  active: boolean;
  payload: LicensePayload | null;
  reason?: string;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlEncodeStr(str: string): string {
  return b64urlEncode(new TextEncoder().encode(str));
}
function b64urlDecodeStr(s: string): string {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64urlEncode(new Uint8Array(sig)).slice(0, 24);
}

/** Generate a license key (used for issuing keys / testing). */
export async function generateLicense(payload: LicensePayload): Promise<string> {
  const p = b64urlEncodeStr(JSON.stringify(payload));
  const sig = await sign(p);
  return `${p}.${sig}`;
}

/** Validate a license key string. */
export async function validateLicense(key: string): Promise<LicenseStatus> {
  try {
    const [p, sig] = key.trim().split(".");
    if (!p || !sig) return { active: false, payload: null, reason: "Format tidak valid" };
    const expectedSig = await sign(p);
    if (expectedSig !== sig) return { active: false, payload: null, reason: "Tanda tangan tidak cocok" };
    const payload = JSON.parse(b64urlDecodeStr(p)) as LicensePayload;
    if (payload.exp && Date.now() > payload.exp) {
      return { active: false, payload, reason: "Lisensi sudah kedaluwarsa" };
    }
    return { active: true, payload };
  } catch {
    return { active: false, payload: null, reason: "Key tidak dapat dibaca" };
  }
}

export async function activateLicense(key: string): Promise<LicenseStatus> {
  const status = await validateLicense(key);
  if (status.active) {
    await setSetting(LICENSE_SETTING, key.trim());
  }
  return status;
}

export async function getStoredLicense(): Promise<LicenseStatus> {
  const key = await getSetting(LICENSE_SETTING);
  if (!key) return { active: false, payload: null };
  return validateLicense(key);
}

export async function removeLicense(): Promise<void> {
  await setSetting(LICENSE_SETTING, "");
}
