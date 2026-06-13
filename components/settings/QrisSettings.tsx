"use client";

import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Input";
import { getSetting, setSetting } from "@/lib/db/queries/settings";
import { QRIS_STATIC_SETTING } from "@/components/QrisModal";
import { looksLikeQris } from "@/lib/utils/qris";
import { toast } from "@/lib/stores/useToastStore";

export function QrisSettings() {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSetting(QRIS_STATIC_SETTING).then((v) => v && setValue(v));
  }, []);

  const save = async () => {
    const v = value.trim();
    if (v && !looksLikeQris(v)) {
      toast.error("Kode QRIS tidak valid (harus diawali 00020101...)");
      return;
    }
    setSaving(true);
    try {
      await setSetting(QRIS_STATIC_SETTING, v);
      toast.success("Kode QRIS disimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold">
        <QrCode size={18} className="text-[var(--color-accent-gold)]" /> QRIS Pembayaran
      </h2>
      <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
        Tempel isi kode QRIS statis merchant-mu (hasil decode QR dari penyedia QRIS).
        Aplikasi akan membuat QR dinamis dengan nominal otomatis saat transaksi QRIS.
        Tidak ada dana yang melewati aplikasi ini.
      </p>
      <div className="flex flex-col gap-3">
        <Field label="Kode QRIS Statis">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="00020101021126..."
            rows={3}
            className="font-mono text-xs"
          />
        </Field>
        <Button loading={saving} onClick={save}>
          Simpan QRIS
        </Button>
      </div>
    </Card>
  );
}
