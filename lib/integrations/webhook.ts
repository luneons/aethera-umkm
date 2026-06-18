"use client";

import { getSetting, setSetting } from "@/lib/db/queries/settings";
import { execute, query } from "@/lib/db/client";

export const WEBHOOK_URL_SETTING = "webhook_url";
export const WEBHOOK_SECRET_SETTING = "webhook_secret";
export const WEBHOOK_ENABLED_SETTING = "webhook_enabled";

export type WebhookEvent =
  | "sale.created"
  | "purchase.created"
  | "stock.low"
  | "target.reached";

export interface WebhookLog {
  id: number;
  event: string;
  status: string | null;
  detail: string | null;
  created_at: string;
}

export async function getWebhookConfig() {
  const [url, secret, enabled] = await Promise.all([
    getSetting(WEBHOOK_URL_SETTING),
    getSetting(WEBHOOK_SECRET_SETTING),
    getSetting(WEBHOOK_ENABLED_SETTING),
  ]);
  return { url: url ?? "", secret: secret ?? "", enabled: enabled === "1" };
}

/** Validate that a webhook URL is a safe public HTTPS endpoint (prevent SSRF). */
function isValidWebhookUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    // Block internal/private IP ranges and localhost
    if (host === "localhost") return false;
    if (/^127\./.test(host)) return false;
    if (/^10\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (host === "0.0.0.0") return false;
    if (host.endsWith(".local")) return false;
    if (host.endsWith(".internal")) return false;
    if (/^\[.*\]$/.test(host)) return false; // IPv6 literals blocked
    return true;
  } catch {
    return false;
  }
}

export async function saveWebhookConfig(url: string, secret: string, enabled: boolean) {
  if (url && !isValidWebhookUrl(url)) {
    throw new Error("URL webhook tidak valid. Harus HTTPS dan bukan alamat internal/localhost.");
  }
  await setSetting(WEBHOOK_URL_SETTING, url);
  await setSetting(WEBHOOK_SECRET_SETTING, secret.slice(0, 256)); // cap secret length
  await setSetting(WEBHOOK_ENABLED_SETTING, enabled ? "1" : "0");
}

export async function getWebhookLogs(limit = 15): Promise<WebhookLog[]> {
  return query<WebhookLog>(
    "SELECT * FROM webhook_log ORDER BY id DESC LIMIT ?",
    [limit]
  );
}

/** Fire a webhook event (best-effort, logged). Premium-gated by caller. */
export async function fireWebhook(
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const { url, secret, enabled } = await getWebhookConfig();
  if (!enabled || !url) return;

  // Double-check URL safety at fire time (config could have been written directly to DB)
  if (!isValidWebhookUrl(url)) return;

  const body = JSON.stringify({
    event,
    data: payload,
    timestamp: new Date().toISOString(),
    source: "aethera-umkm",
  });

  let status = "ok";
  let detail = "";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-webhook-secret": secret } : {}),
      },
      body,
    });
    status = res.ok ? "ok" : `error ${res.status}`;
    if (!res.ok) detail = await res.text().catch(() => "");
  } catch (e) {
    status = "failed";
    detail = e instanceof Error ? e.message : "network error";
  }
  await execute("INSERT INTO webhook_log (event, status, detail) VALUES (?, ?, ?)", [
    event,
    status,
    detail.slice(0, 300),
  ]);
}

/** Send a test ping. */
export async function testWebhook(): Promise<void> {
  await fireWebhook("sale.created", { test: true, message: "Ping dari AETHERA UMKM" });
}
