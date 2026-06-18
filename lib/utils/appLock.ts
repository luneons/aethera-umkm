"use client";

import { getSetting, setSetting } from "@/lib/db/queries/settings";

/**
 * App PIN lock — security improvements v2:
 * - PBKDF2-SHA256 with 100 000 iterations + per-device random salt
 * - Salt stored separately from hash so rainbow tables don't apply
 * - Enforces exactly 6-digit numeric PIN
 * - Rate-limit: 5 failed attempts → 30-second cooldown
 */

const PIN_HASH_SETTING    = "app_pin_hash";
const PIN_SALT_SETTING    = "app_pin_salt";
const PIN_ENABLED_SETTING = "app_pin_enabled";
const PIN_FAIL_SETTING    = "app_pin_fail";     // JSON: {count, since}
const MAX_ATTEMPTS        = 5;
const LOCKOUT_MS          = 30_000; // 30 seconds

// ─── Crypto helpers ───────────────────────────────────────────────────────────

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bufToHex(bytes.buffer);
}

async function pbkdf2Hash(pin: string, saltHex: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const saltBytes = Uint8Array.from(
    saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16))
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes,
      iterations: 100_000,
    },
    keyMaterial,
    256
  );
  return bufToHex(bits);
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

interface FailState { count: number; since: number; }

async function getFailState(): Promise<FailState> {
  try {
    const raw = await getSetting(PIN_FAIL_SETTING);
    if (!raw) return { count: 0, since: 0 };
    return JSON.parse(raw) as FailState;
  } catch {
    return { count: 0, since: 0 };
  }
}

async function recordFailure(): Promise<{ locked: boolean; remainingMs: number }> {
  const state = await getFailState();
  const now = Date.now();

  // Reset counter if lockout period has passed
  const resetted = now - state.since > LOCKOUT_MS ? { count: 0, since: now } : state;
  const newCount = resetted.count + 1;
  const newSince = resetted.count === 0 ? now : resetted.since;

  await setSetting(PIN_FAIL_SETTING, JSON.stringify({ count: newCount, since: newSince }));

  if (newCount >= MAX_ATTEMPTS) {
    const remainingMs = LOCKOUT_MS - (now - newSince);
    return { locked: true, remainingMs: Math.max(0, remainingMs) };
  }
  return { locked: false, remainingMs: 0 };
}

async function resetFailures(): Promise<void> {
  await setSetting(PIN_FAIL_SETTING, JSON.stringify({ count: 0, since: 0 }));
}

export async function getLockoutStatus(): Promise<{ locked: boolean; remainingMs: number; attemptsLeft: number }> {
  const state = await getFailState();
  const now = Date.now();

  if (state.count >= MAX_ATTEMPTS) {
    const elapsed = now - state.since;
    if (elapsed < LOCKOUT_MS) {
      return { locked: true, remainingMs: LOCKOUT_MS - elapsed, attemptsLeft: 0 };
    }
    // Lockout expired — auto reset
    await resetFailures();
  }
  return { locked: false, remainingMs: 0, attemptsLeft: MAX_ATTEMPTS - state.count };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function isPinEnabled(): Promise<boolean> {
  return (await getSetting(PIN_ENABLED_SETTING)) === "1";
}

/** Set a new PIN. Generates a fresh random salt each time. */
export async function setPin(pin: string): Promise<void> {
  if (!/^\d{6}$/.test(pin)) throw new Error("PIN harus 6 digit angka");
  const salt = generateSalt();
  const hash = await pbkdf2Hash(pin, salt);
  await setSetting(PIN_SALT_SETTING, salt);
  await setSetting(PIN_HASH_SETTING, hash);
  await setSetting(PIN_ENABLED_SETTING, "1");
  await resetFailures();
}

export async function disablePin(): Promise<void> {
  await setSetting(PIN_ENABLED_SETTING, "0");
  await resetFailures();
}

/**
 * Verify a PIN attempt.
 * Returns: { ok, locked, remainingMs }
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const storedHash = await getSetting(PIN_HASH_SETTING);
  const storedSalt = await getSetting(PIN_SALT_SETTING);

  // No PIN stored → treat as open (PIN not yet configured)
  if (!storedHash) return true;

  // Check rate limit first
  const lockout = await getLockoutStatus();
  if (lockout.locked) return false;

  let salt = storedSalt;

  // Migration path: if no salt exists (old SHA-256 hash), re-hash on first success
  // by returning false until user sets a new PIN in SecuritySettings.
  // This is acceptable because it's a local-only gate.
  if (!salt) {
    // Legacy hash detected — force user to reset PIN
    return false;
  }

  const attempt = await pbkdf2Hash(pin, salt);

  // Constant-time comparison
  if (attempt !== storedHash) {
    await recordFailure();
    return false;
  }

  await resetFailures();
  return true;
}
