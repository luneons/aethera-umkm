import { cookies } from "next/headers";

const ADMIN_COOKIE = "aethera_admin";
const COOKIE_TTL_SECONDS = 60 * 60;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sign(value: string): Promise<string> {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("ADMIN_PASSWORD belum dikonfigurasi di server");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export async function createAdminCookieValue(): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;
  const value = String(expires);
  return `${value}.${await sign(value)}`;
}

export async function isAdminRequest(): Promise<boolean> {
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const [expires, signature] = value.split(".");
  if (!expires || !signature || Number(expires) < Math.floor(Date.now() / 1000)) return false;
  const expected = await sign(expires);
  try {
    const actualBytes = fromBase64Url(signature);
    const expectedBytes = fromBase64Url(expected);
    if (actualBytes.length !== expectedBytes.length) return false;
    return actualBytes.every((byte, index) => byte === expectedBytes[index]);
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE_NAME = ADMIN_COOKIE;
export const ADMIN_COOKIE_TTL_SECONDS = COOKIE_TTL_SECONDS;
