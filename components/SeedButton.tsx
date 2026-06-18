"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { seedDemoData } from "@/lib/db/seed";
import { useConfirm } from "@/lib/stores/useConfirm";
import { useAppStore } from "@/lib/stores/useAppStore";
import { toast } from "@/lib/stores/useToastStore";

interface Props {
  onDone?: () => void;
}

export function SeedButton({ onDone }: Props) {
  const confirm = useConfirm((s) => s.confirm);
  const bumpData = useAppStore((s) => s.bumpData);
  const refreshProfile = useAppStore((s) => s.refreshProfile);
  const [seeding, setSeeding] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const handleSeed = async () => {
    const ok = await confirm({
      title: "Isi Data Demo?",
      message:
        "Akan ditambahkan data fiktif Warung Bu Sari — 12 produk, pelanggan, supplier, dan transaksi 90 hari terakhir. Data yang sudah ada tidak dihapus.",
      confirmLabel: "Lanjutkan",
      danger: false,
    });
    if (!ok) return;

    setSeeding(true);
    setLog([]);
    try {
      await seedDemoData((msg: string) => setLog((prev) => [...prev, msg]));
      await refreshProfile();
      bumpData();
      toast.success("Data demo berhasil dimuat!");
      onDone?.();
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data demo");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold">
        <FlaskConical size={18} className="text-[var(--color-accent-gold)]" /> Data Demo
      </h2>
      <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
        Isi database dengan data warung makan fiktif untuk mencoba semua fitur — 12 produk,
        5 pelanggan, 3 supplier, dan transaksi selama 90 hari terakhir.
      </p>

      {log.length > 0 && (
        <div className="mb-3 max-h-32 overflow-y-auto rounded-xl bg-[var(--color-bg-elevated)] p-3 font-mono text-xs text-[var(--color-text-muted)] space-y-0.5">
          {log.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      <Button variant="outline" fullWidth loading={seeding} onClick={handleSeed}>
        <FlaskConical size={16} />
        {seeding ? "Memuat data..." : "Isi Data Demo"}
      </Button>
    </Card>
  );
}
