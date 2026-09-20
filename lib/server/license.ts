export interface ServerLicensePayload {
  name: string;
  plan: "premium";
  exp: number | null;
  device?: string | null;
}

export interface ServerLicenseStatus {
  active: boolean;
  payload: ServerLicensePayload | null;
  reason?: string;
}

const MAX_KEY_LENGTH = 4096;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodeString(value: string): string {
  return toBase64Url(new TextEncoder().encode(value));
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeString(value: string): string {
  return new TextDecoder().decode(fromBase64Url(value));
}

async function getHmacKey(usages: KeyUsage[]): Promise<CryptoKey> {
  const secret = process.env.LICENSE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("LICENSE_SECRET belum dikonfigurasi atau terlalu pendek");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages
  );
}

export async function generateServerLicense(payload: ServerLicensePayload): Promise<string> {
  const clean: ServerLicensePayload = {
    name: String(payload.name).slice(0, 120).trim(),
    plan: "premium",
    exp: typeof payload.exp === "number" ? Math.floor(payload.exp) : null,
    device: payload.device ? String(payload.device).slice(0, 64).trim() : null,
  };
  if (!clean.name) throw new Error("Nama lisensi wajib diisi");
  const encoded = encodeString(JSON.stringify(clean));
  const key = await getHmacKey(["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  return `${encoded}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyServerLicense(rawKey: string): Promise<ServerLicenseStatus> {
  try {
    if (!rawKey || rawKey.length > MAX_KEY_LENGTH) {
      return { active: false, payload: null, reason: "Format tidak valid" };
    }
    const keyValue = rawKey.trim();
    const dot = keyValue.indexOf(".");
    if (dot <= 0 || keyValue.indexOf(".", dot + 1) !== -1) {
      return { active: false, payload: null, reason: "Format tidak valid" };
    }
    const encoded = keyValue.slice(0, dot);
    const signature = keyValue.slice(dot + 1);
    const hmacKey = await getHmacKey(["verify"]);
    const valid = await crypto.subtle.verify(
      "HMAC",
      hmacKey,
      fromBase64Url(signature) as unknown as BufferSource,
      new TextEncoder().encode(encoded)
    );
    if (!valid) return { active: false, payload: null, reason: "Tanda tangan tidak valid" };

    const unknownPayload: unknown = JSON.parse(decodeString(encoded));
    if (
      typeof unknownPayload !== "object" ||
      unknownPayload === null ||
      typeof (unknownPayload as Record<string, unknown>).name !== "string" ||
      (unknownPayload as Record<string, unknown>).plan !== "premium"
    ) {
      return { active: false, payload: null, reason: "Payload tidak valid" };
    }
    const payload = unknownPayload as ServerLicensePayload;
    if (payload.exp !== null && (typeof payload.exp !== "number" || !Number.isFinite(payload.exp))) {
      return { active: false, payload: null, reason: "Masa berlaku tidak valid" };
    }
    if (payload.exp !== null && Date.now() > payload.exp) {
      return { active: false, payload, reason: "Lisensi sudah kedaluwarsa" };
    }
    return { active: true, payload };
  } catch {
    return { active: false, payload: null, reason: "Lisensi tidak dapat diverifikasi" };
  }
}
