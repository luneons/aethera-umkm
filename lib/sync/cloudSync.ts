"use client";

import { exportDatabase, importDatabase } from "@/lib/db/client";
import { getSetting, setSetting } from "@/lib/db/queries/settings";

/**
 * Optional cloud sync — uploads/downloads the whole SQLite snapshot to a
 * user-configured REST endpoint. Designed as a simple last-write-wins backup
 * so it works with any object storage / serverless function the user provides.
 *
 * Expected endpoint contract:
 *   PUT  {url}    body: binary db, header: x-sync-key  -> stores snapshot
 *   GET  {url}    header: x-sync-key                   -> returns binary db
 */

export const SYNC_URL_SETTING = "sync_url";
export const SYNC_KEY_SETTING = "sync_key";
export const SYNC_LAST_SETTING = "sync_last_at";

export async function getSyncConfig() {
  const [url, key, lastAt] = await Promise.all([
    getSetting(SYNC_URL_SETTING),
    getSetting(SYNC_KEY_SETTING),
    getSetting(SYNC_LAST_SETTING),
  ]);
  return { url, key, lastAt };
}

function isValidSyncUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || /^127\./.test(host) || /^10\./.test(host)) return false;
    if (/^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (host === "0.0.0.0" || host.endsWith(".local") || host.endsWith(".internal")) return false;
    return true;
  } catch {
    return false;
  }
}

export async function saveSyncConfig(url: string, key: string) {
  if (url && !isValidSyncUrl(url)) {
    throw new Error("URL sinkronisasi tidak valid. Harus HTTPS dan bukan alamat internal.");
  }
  await setSetting(SYNC_URL_SETTING, url);
  await setSetting(SYNC_KEY_SETTING, key.slice(0, 256));
}

export async function pushToCloud(): Promise<void> {
  const { url, key } = await getSyncConfig();
  if (!url) throw new Error("URL sinkronisasi belum diatur");
  const data = await exportDatabase();
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/octet-stream",
      ...(key ? { "x-sync-key": key } : {}),
    },
    body: data.slice(0) as unknown as BodyInit,
  });
  if (!res.ok) throw new Error(`Gagal unggah (HTTP ${res.status})`);
  await setSetting(SYNC_LAST_SETTING, new Date().toISOString());
}

export async function pullFromCloud(): Promise<void> {
  const { url, key } = await getSyncConfig();
  if (!url) throw new Error("URL sinkronisasi belum diatur");
  if (!isValidSyncUrl(url)) throw new Error("URL sinkronisasi tidak valid");
  const res = await fetch(url, {
    method: "GET",
    headers: { ...(key ? { "x-sync-key": key } : {}) },
  });
  if (!res.ok) throw new Error(`Gagal unduh (HTTP ${res.status})`);
  // Cap download size at 50 MB to prevent memory exhaustion
  const MAX_BYTES = 50 * 1024 * 1024;
  const contentLength = res.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
    throw new Error("File terlalu besar (maks 50 MB)");
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength === 0) throw new Error("Tidak ada data di cloud");
  if (buf.byteLength > MAX_BYTES) throw new Error("File terlalu besar (maks 50 MB)");
  await importDatabase(buf);
  await setSetting(SYNC_LAST_SETTING, new Date().toISOString());
}
