"use client";

import { useEffect, useState } from "react";
import { Crown, Check, Sparkles, Cloud, Users, FileText, Webhook, Infinity as InfinityIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { usePremium } from "@/lib/stores/usePremium";
import { activateLicense, removeLicense, generateLicense } from "@/lib/premium/license";
import { getBusinessProfile } from "@/lib/db/queries/settings";
import { toast } from "@/lib/stores/useToastStore";
import { formatDate } from "@/lib/utils/format";

const FEATURES = [
  { icon: Sparkles, label: "AI Insight tanpa batas" },
  { icon: Cloud, label: "Cloud Sync antar perangkat" },
  { icon: Users, label: "Multi-pengguna (kasir & pemilik)" },
  { icon: FileText, label: "Laporan Pajak UMKM (PPh 0,5%)" },
  { icon: Webhook, label: "Integrasi API / Webhook" },
  { icon: InfinityIcon, label: "Produk & transaksi tanpa batas" },
];

export default function PremiumPage() {
  const { active, payload, refresh } = usePremium();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleActivate = async () => {
    if (!key.trim()) {
      toast.error("Masukkan license key");
      return;
    }
    setBusy(true);
    try {
      const status = await activateLicense(key);
      if (status.active) {
        await refresh();
        toast.success("Premium aktif! Terima kasih 🎉");
        setKey("");
      } else {
        toast.error(status.reason ?? "License tidak valid");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    await removeLicense();
    await refresh();
    toast.success("Lisensi dihapus");
  };

  // Demo: generate a trial key (30 hari) untuk mencoba fitur premium.
  const handleTrial = async () => {
    setBusy(true);
    try {
      const profile = await getBusinessProfile();
      const trialKey = await generateLicense({
        name: profile?.name ?? "Trial",
        plan: "premium",
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
      const status = await activateLicense(trialKey);
      if (status.active) {
        await refresh();
        toast.success("Trial Premium 30 hari aktif!");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        <PageHeader title="AETHERA Premium" subtitle="Buka semua fitur canggih" />

        {/* Status banner */}
        <Card
          className={
            active
              ? "border-[var(--color-accent-gold)]/50 bg-[var(--color-accent-gold)]/5"
              : ""
          }
        >
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)]">
              <Crown size={24} />
            </div>
            <div className="min-w-0 flex-1">
              {active ? (
                <>
                  <p className="font-heading text-base font-bold text-[var(--color-accent-gold)]">
                    Premium Aktif
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {payload?.name} ·{" "}
                    {payload?.exp ? `Berlaku s/d ${formatDate(new Date(payload.exp))}` : "Lifetime"}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-heading text-base font-bold">Paket Gratis</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Upgrade untuk membuka semua fitur premium.
                  </p>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Feature list */}
        <Card>
          <h2 className="mb-3 font-heading text-base font-bold">Yang kamu dapatkan</h2>
          <ul className="flex flex-col gap-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.label} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-accent-gold)]">
                    <Icon size={17} />
                  </span>
                  <span className="flex-1 text-sm">{f.label}</span>
                  <Check size={16} className="text-[var(--color-success)]" />
                </li>
              );
            })}
          </ul>
        </Card>

        {active ? (
          <Button variant="outline" onClick={handleRemove}>
            Nonaktifkan Premium
          </Button>
        ) : (
          <>
            {/* Pricing */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="text-center">
                <p className="text-sm text-[var(--color-text-secondary)]">Bulanan</p>
                <p className="mt-1 font-heading text-2xl font-extrabold">
                  Rp25.000
                  <span className="text-sm font-normal text-[var(--color-text-muted)]">/bln</span>
                </p>
              </Card>
              <Card className="relative text-center border-[var(--color-accent-gold)]/40">
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-accent-gold)] px-2 py-0.5 text-[10px] font-bold text-black">
                  HEMAT 33%
                </span>
                <p className="text-sm text-[var(--color-text-secondary)]">Tahunan</p>
                <p className="mt-1 font-heading text-2xl font-extrabold">
                  Rp200.000
                  <span className="text-sm font-normal text-[var(--color-text-muted)]">/thn</span>
                </p>
              </Card>
            </div>

            {/* License activation */}
            <Card>
              <h2 className="mb-1 font-heading text-base font-bold">Aktivasi License Key</h2>
              <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
                Sudah punya key? Masukkan di bawah. License diverifikasi offline dan
                tersimpan di perangkatmu.
              </p>
              <div className="flex flex-col gap-2">
                <Field label="License Key">
                  <Input
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="xxxxx.xxxxx"
                  />
                </Field>
                <Button loading={busy} onClick={handleActivate}>
                  <Crown size={16} /> Aktifkan Premium
                </Button>
                <Button variant="ghost" onClick={handleTrial} loading={busy}>
                  Coba Gratis 30 Hari
                </Button>
              </div>
            </Card>
          </>
        )}

        <p className="text-center text-xs text-[var(--color-text-muted)]">
          Pembayaran &amp; penerbitan license dilakukan di luar aplikasi (mis. via admin /
          marketplace). Validasi berjalan offline di perangkat.
        </p>
      </div>
    </PageTransition>
  );
}
