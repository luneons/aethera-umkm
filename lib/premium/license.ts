"use client";

import { getSetting, setSetting } from "@/lib/db/queries/settings";
import { getDeviceId } from "./device";

/**
 * Premium licensing — offline soft-gate with HMAC-SHA256 + device binding.
 *
 * Security improvements v3:
 * - Full 43-char base64url signature (256-bit) — not truncated
 * - Strict format validation: exactly 2 dot-separated segments
 * - Payload field validation before trusting content
 * - Constant-time comparison via crypto.subtle.verify
 * - Key clamped: max 4096 chars to prevent DoS
 * - DEVICE BINDING: a key may carry a `device` field. If present, it only
 *   activates on the device whose ID matches. This stops casual key sharing
 *   (e.g. forwarding the key in a WhatsApp group). Keys with device=null are
 *   unbound (work anywhere) for backward compatibility / special cases.
 *
 * Signature verification is performed by the server. The client never
 * receives the signing secret.
 */

const LICENSE_SETTING = "premium_license";
const MAX_KEY_LENGTH = 4096;

export interface LicensePayload {
  name: string;
  plan: "premium";
  exp: number | null; // epoch ms, null = lifetime
  device?: string | null; // bound device id; null/absent = unbound (works anywhere)
}

export interface LicenseStatus {
  active: boolean;
  payload: LicensePayload | null;
  reason?: string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Validate a license key through the server. */
export async function validateLicense(rawKey: string): Promise<LicenseStatus> {
  try {
    if (!rawKey || rawKey.length > MAX_KEY_LENGTH) {
      return { active: false, payload: null, reason: "Format tidak valid" };
    }
    const response = await fetch("/api/license/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: rawKey.trim(), deviceId: getDeviceId() }),
    });
    const status = await response.json() as LicenseStatus;
    return status;
  } catch {
    return { active: false, payload: null, reason: "Validasi lisensi membutuhkan koneksi internet." };
  }
}

export async function activateLicense(key: string): Promise<LicenseStatus> {
  const status = await validateLicense(key);
  if (status.active) {
    try {
      const payload = status.payload!;
      const response = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.trim(),
          deviceId: getDeviceId(),
        }),
      });

      if (response.status === 409) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        return {
          active: false,
          payload: status.payload,
          reason: data?.error ?? "Lisensi ini sudah digunakan pada perangkat lain.",
        };
      }
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null;
        return {
          active: false,
          payload: status.payload,
          reason: data?.error ?? "Aktivasi lisensi gagal.",
        };
      }
    } catch {
      return { active: false, payload: status.payload, reason: "Aktivasi membutuhkan koneksi internet." };
    }

    try {
      await setSetting(LICENSE_SETTING, key.trim().slice(0, MAX_KEY_LENGTH));
    } catch {
      return {
        active: false,
        payload: status.payload,
        reason: "Lisensi valid, tetapi gagal disimpan. Periksa penyimpanan browser lalu coba lagi.",
      };
    }
  }
  return status;
}

export async function requestTrialLicense(name: string): Promise<string> {
  const response = await fetch("/api/license/trial", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.slice(0, 120), deviceId: getDeviceId() }),
  });
  const data = await response.json().catch(() => null) as { key?: string; error?: string } | null;
  if (!response.ok || !data?.key) {
    throw new Error(data?.error ?? "Gagal membuat lisensi trial");
  }
  return data.key;
}

export async function getStoredLicense(): Promise<LicenseStatus> {
  try {
    const key = await getSetting(LICENSE_SETTING);
    if (!key) return { active: false, payload: null };
    return validateLicense(key);
  } catch {
    // Non-fatal — treat as no license
    return { active: false, payload: null };
  }
}

export async function removeLicense(): Promise<void> {
  await setSetting(LICENSE_SETTING, "");
}
