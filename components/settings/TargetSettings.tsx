"use client";

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { formatThousands, parseRupiah } from "@/lib/utils/format";
import { getTarget, setTarget, deleteTarget } from "@/lib/db/queries/targets";
import { toast } from "@/lib/stores/useToastStore";
import { useAppStore } from "@/lib/stores/useAppStore";

export function TargetSettings() {
  const bumpData = useAppStore((s) => s.bumpData);
  const [daily, setDaily] = useState("");
  const [monthly, setMonthly] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const d = await getTarget("harian");
      const m = await getTarget("bulanan");
      if (d) setDaily(formatThousands(String(Math.round(d.amount))));
      if (m) setMonthly(formatThousands(String(Math.round(m.amount))));
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const d = parseRupiah(daily);
      const m = parseRupiah(monthly);
      if (d > 0) await setTarget("harian", d);
      else await deleteTarget("harian");
      if (m > 0) await setTarget("bulanan", m);
      else await deleteTarget("bulanan");
      bumpData();
      toast.success("Target disimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold">
        <Target size={18} className="text-[var(--color-accent-gold)]" /> Target Omset
      </h2>
      <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
        Tetapkan target penjualan. Progres muncul di Beranda. Kosongkan untuk menonaktifkan.
      </p>
      <div className="flex flex-col gap-3">
        <Field label="Target Harian">
          <Input
            inputMode="numeric"
            value={daily}
            onChange={(e) => setDaily(formatThousands(e.target.value))}
            placeholder="0"
          />
        </Field>
        <Field label="Target Bulanan">
          <Input
            inputMode="numeric"
            value={monthly}
            onChange={(e) => setMonthly(formatThousands(e.target.value))}
            placeholder="0"
          />
        </Field>
        <Button loading={saving} onClick={save}>
          Simpan Target
        </Button>
      </div>
    </Card>
  );
}
