"use client";

import { getSetting, setSetting } from "@/lib/db/queries/settings";

const PIN_HASH_SETTING = "app_pin_hash";
const PIN_ENABLED_SETTING = "app_pin_enabled";

/** Hash a PIN with SHA-256 (sufficient for local on-device gate). */
async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode("aethera:" + pin);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isPinEnabled(): Promise<boolean> {
  return (await getSetting(PIN_ENABLED_SETTING)) === "1";
}

export async function setPin(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  await setSetting(PIN_HASH_SETTING, hash);
  await setSetting(PIN_ENABLED_SETTING, "1");
}

export async function disablePin(): Promise<void> {
  await setSetting(PIN_ENABLED_SETTING, "0");
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await getSetting(PIN_HASH_SETTING);
  if (!stored) return true;
  return (await hashPin(pin)) === stored;
}
