"use client";

import { getSetting, setSetting } from "@/lib/db/queries/settings";

/**
 * Premium licensing — offline soft-gate with HMAC-SHA256.
 *
 * Security improvements v2:
 * - Full 43-char base64url signature (256-bit → ~32 bytes) instead of 24-char truncated
 * - Strict format validation: exactly 2 dot-separated segments
 * - Payload field validation before trusting content
 * - Constant-time comparison via crypto.subtle.verify to prevent timing attacks
 * - Key clamped: max length 4096 chars to prevent DoS via oversized input
 *
 * NOTE: Because the secret lives in the client bundle this is a SOFT gate —
 * it deters casual bypass. Anyone who extracts the bundle can forge keys.
 * For hard enforcement, add a server-side validation endpoint.
 */

// Secret is intentionally non-sensitive; rotate yearly by updating the year suffix.
const APP_SECRET =
  (process.env.NEXT_PUBLIC_LICENSE_SECRET as string) ||
  "aethera-umkm-license-2026-q2-xK9mP";

const LICENSE_SETTING = "premium_license";
const MAX_KEY_LENGTH = 4096;

export interface LicensePayload {
  name: string;
  plan: "premium";
  exp: number | null; // epoch ms, null = lifetime
}

export interface LicenseStatus {
  active: boolean;
  payload: LicensePayload | null;
  reason?: string;
}

// ─── Encoding helpers ─────────────────────────────────────────────────────────

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlEncodeStr(str: string): string {
  return b64urlEncode(new TextEncoder().encode(str));
}

function b64urlDecodeBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 ? "=".repeat(4 - (padded.length % 4)) : "";
  const bin = atob(padded + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function b64urlDecodeStr(s: string): string {
  return new TextDecoder().decode(b64urlDecodeBytes(s));
}

// ─── Signing ──────────────────────────────────────────────────────────────────

async function importHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(payload: string): Promise<string> {
  const key = await importHmacKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  // Full 32-byte signature — do NOT truncate
  return b64urlEncode(new Uint8Array(sig));
}

/** Constant-time HMAC verify to prevent timing-based forgery. */
async function verify(payload: string, sigB64: string): Promise<boolean> {
  try {
    const key = await importHmacKey();
    const sigBytes = b64urlDecodeBytes(sigB64);
    const dataBytes = new TextEncoder().encode(payload);
    return crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as unknown as BufferSource,
      dataBytes as unknown as BufferSource
    );
  } catch {
    return false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Generate a license key. Only called from admin panel. */
export async function generateLicense(payload: LicensePayload): Promise<string> {
  // Sanitise payload before embedding
  const clean: LicensePayload = {
    name: String(payload.name).slice(0, 120).trim(),
    plan: "premium",
    exp: typeof payload.exp === "number" ? Math.floor(payload.exp) : null,
  };
  const p = b64urlEncodeStr(JSON.stringify(clean));
  const sig = await sign(p);
  return `${p}.${sig}`;
}

/** Validate a license key string. Strict: exactly 2 segments. */
export async function validateLicense(rawKey: string): Promise<LicenseStatus> {
  try {
    // Length guard — prevent oversized inputs
    if (!rawKey || rawKey.length > MAX_KEY_LENGTH) {
      return { active: false, payload: null, reason: "Format tidak valid" };
    }

    const trimmed = rawKey.trim();
    const dotIdx = trimmed.indexOf(".");
    if (dotIdx === -1) return { active: false, payload: null, reason: "Format tidak valid" };

    const p = trimmed.slice(0, dotIdx);
    const sig = trimmed.slice(dotIdx + 1);

    // Reject if there are more dots inside the signature part (extra segments)
    if (!p || !sig || sig.includes(".")) {
      return { active: false, payload: null, reason: "Format tidak valid" };
    }

    // Constant-time signature verification
    const ok = await verify(p, sig);
    if (!ok) {
      return { active: false, payload: null, reason: "Tanda tangan tidak valid" };
    }

    // Parse and validate payload structure
    let payload: unknown;
    try {
      payload = JSON.parse(b64urlDecodeStr(p));
    } catch {
      return { active: false, payload: null, reason: "Payload tidak dapat dibaca" };
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof (payload as Record<string, unknown>).name !== "string" ||
      (payload as Record<string, unknown>).plan !== "premium"
    ) {
      return { active: false, payload: null, reason: "Payload tidak valid" };
    }

    const typed = payload as LicensePayload;

    // Expiry check
    if (typed.exp !== null && typeof typed.exp === "number") {
      if (Date.now() > typed.exp) {
        return { active: false, payload: typed, reason: "Lisensi sudah kedaluwarsa" };
      }
    }

    return { active: true, payload: typed };
  } catch {
    return { active: false, payload: null, reason: "Terjadi kesalahan validasi" };
  }
}

export async function activateLicense(key: string): Promise<LicenseStatus> {
  const status = await validateLicense(key);
  if (status.active) {
    await setSetting(LICENSE_SETTING, key.trim().slice(0, MAX_KEY_LENGTH));
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
