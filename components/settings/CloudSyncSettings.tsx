"use client";

import { useEffect, useState } from "react";
import { Cloud, UploadCloud, DownloadCloud } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import {
  getSyncConfig,
  saveSyncConfig,
  pushToCloud,
  pullFromCloud,
} from "@/lib/sync/cloudSync";
import { useConfirm } from "@/lib/stores/useConfirm";
import { useAppStore } from "@/lib/stores/useAppStore";
import { toast } from "@/lib/stores/useToastStore";
import { formatDateTime } from "@/lib/utils/format";

export function CloudSyncSettings() {
  const confirm = useConfirm((s) => s.confirm);
  const refreshProfile = useAppStore((s) => s.refreshProfile);
  const bumpData = useAppStore((s) => s.bumpData);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [lastAt, setLastAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSyncConfig().then((c) => {
      setUrl(c.url ?? "");
      setKey(c.key ?? "");
      setLastAt(c.lastAt);
    });
  }, []);

  const save = async () => {
    await saveSyncConfig(url.trim(), key.trim());
    toast.success("Konfigurasi sync disimpan");
  };

  const push = async () => {
    setBusy(true);
    try {
      await save();
      await pushToCloud();
      const c = await getSyncConfig();
      setLastAt(c.lastAt);
      toast.success("Data diunggah ke cloud");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal unggah");
    } finally {
      setBusy(false);
    }
  };

  const pull = async () => {
    const ok = await confirm({
      title: "Tarik data dari cloud?",
      message: "Data lokal saat ini akan diganti dengan data dari cloud. Backup keamanan lokal akan dibuat otomatis sebelum proses restore.",
      confirmLabel: "Tarik",
      danger: false,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await save();
      await pullFromCloud();
      await refreshProfile();
      bumpData();
      const c = await getSyncConfig();
      setLastAt(c.lastAt);
      toast.success("Data ditarik dari cloud");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal unduh");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold">
        <Cloud size={18} className="text-[var(--color-accent-gold)]" /> Cloud Sync
        (Opsional)
      </h2>
      <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
        Sinkronkan data antar perangkat lewat endpoint penyimpananmu sendiri (REST: PUT
        untuk unggah, GET untuk unduh). Cocok untuk Cloudflare R2, Supabase Storage, atau
        serverless function.
      </p>
      <div className="flex flex-col gap-3">
        <Field label="URL Endpoint">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://contoh.com/aethera-sync"
          />
        </Field>
        <Field label="Kunci Akses (header x-sync-key)">
          <Input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Opsional"
          />
        </Field>
        {lastAt && (
          <p className="text-xs text-[var(--color-text-muted)]">
            Sinkronisasi terakhir: {formatDateTime(lastAt)}
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" fullWidth loading={busy} onClick={push}>
            <UploadCloud size={16} /> Unggah
          </Button>
          <Button variant="outline" fullWidth loading={busy} onClick={pull}>
            <DownloadCloud size={16} /> Tarik
          </Button>
        </div>
      </div>
    </Card>
  );
}
