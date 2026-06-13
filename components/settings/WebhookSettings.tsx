"use client";

import { useEffect, useState } from "react";
import { Webhook, Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import {
  getWebhookConfig,
  saveWebhookConfig,
  testWebhook,
  getWebhookLogs,
  type WebhookLog,
} from "@/lib/integrations/webhook";
import { toast } from "@/lib/stores/useToastStore";
import { formatDateTime } from "@/lib/utils/format";

export function WebhookSettings() {
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [busy, setBusy] = useState(false);

  const loadLogs = () => getWebhookLogs(5).then(setLogs);

  useEffect(() => {
    getWebhookConfig().then((c) => {
      setUrl(c.url);
      setSecret(c.secret);
      setEnabled(c.enabled);
    });
    loadLogs();
  }, []);

  const save = async () => {
    await saveWebhookConfig(url.trim(), secret.trim(), enabled);
    toast.success("Konfigurasi webhook disimpan");
  };

  const test = async () => {
    setBusy(true);
    try {
      await save();
      await testWebhook();
      await loadLogs();
      toast.success("Test webhook dikirim");
    } catch {
      toast.error("Gagal mengirim test");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold">
        <Webhook size={18} className="text-[var(--color-accent-gold)]" /> Integrasi API
        (Webhook)
      </h2>
      <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
        Kirim event (penjualan, pembelian, stok menipis) ke sistem lain secara otomatis
        via HTTP POST. Berguna untuk integrasi dengan spreadsheet, Zapier, atau backend
        sendiri.
      </p>
      <div className="flex flex-col gap-3">
        <label className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3">
          <span className="text-sm font-medium">Aktifkan Webhook</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-accent-gold)]"
          />
        </label>
        <Field label="URL Endpoint">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://contoh.com/webhook"
          />
        </Field>
        <Field label="Secret (header x-webhook-secret)">
          <Input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Opsional"
          />
        </Field>
        <div className="flex gap-2">
          <Button fullWidth onClick={save}>
            Simpan
          </Button>
          <Button variant="outline" fullWidth loading={busy} onClick={test}>
            <Send size={16} /> Test
          </Button>
        </div>

        {logs.length > 0 && (
          <div className="mt-1">
            <p className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">
              Log terakhir
            </p>
            <ul className="flex flex-col divide-y divide-[var(--color-border)]">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                  <span className="truncate text-[var(--color-text-secondary)]">
                    {l.event} · {formatDateTime(l.created_at)}
                  </span>
                  <span
                    style={{
                      color: l.status === "ok" ? "var(--color-success)" : "var(--color-danger)",
                    }}
                  >
                    {l.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
