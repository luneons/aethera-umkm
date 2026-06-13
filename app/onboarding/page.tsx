"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Moon, Sun } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { saveBusinessProfile } from "@/lib/db/queries/settings";
import { businessProfileSchema } from "@/lib/validations/transaction";
import { useAppStore } from "@/lib/stores/useAppStore";
import { gsap, shake } from "@/lib/animations/gsap";
import { cn } from "@/lib/utils/cn";

const BUSINESS_TYPES = [
  "Warung / Toko Kelontong",
  "Kuliner / Makanan & Minuman",
  "Fashion / Pakaian",
  "Jasa",
  "Pertanian / Peternakan",
  "Kerajinan",
  "Lainnya",
];

export default function OnboardingPage() {
  const router = useRouter();
  const refreshProfile = useAppStore((s) => s.refreshProfile);
  const setTheme = useAppStore((s) => s.setTheme);
  const ready = useAppStore((s) => s.ready);
  const profile = useAppStore((s) => s.profile);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [type, setType] = useState(BUSINESS_TYPES[0]);
  const [owner, setOwner] = useState("");
  const [theme, setLocalTheme] = useState<"dark" | "light">("dark");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ready && profile) router.replace("/dashboard");
  }, [ready, profile, router]);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [step]);

  const validateStep1 = () => {
    const result = businessProfileSchema.safeParse({ name, type, owner });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(fieldErrors);
      shake(cardRef.current);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await saveBusinessProfile({ name, type, owner });
      await setTheme(theme);
      await refreshProfile();
      router.replace("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--color-bg-primary)] p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size={52} />
          <div>
            <h1 className="font-heading text-2xl font-extrabold">AETHERA UMKM</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Mulai catat omset UMKM-mu hari ini
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="mb-5 flex items-center justify-center gap-2">
          {[0, 1, 2].map((s) => (
            <span
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all",
                s === step
                  ? "w-8 bg-[var(--color-accent-gold)]"
                  : s < step
                  ? "w-4 bg-[var(--color-accent-gold)]/50"
                  : "w-4 bg-[var(--color-border)]"
              )}
            />
          ))}
        </div>

        <Card ref={cardRef}>
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold">Selamat datang!</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Catat penjualan dan pembelian dengan mudah, bahkan tanpa internet.
                  Semua data tersimpan aman di perangkatmu.
                </p>
              </div>
              <ul className="flex flex-col gap-2 text-sm">
                {[
                  "Pencatatan cepat kurang dari 30 detik",
                  "Laporan harian, mingguan & bulanan otomatis",
                  "Bekerja penuh secara offline",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check size={16} className="text-[var(--color-success)]" />
                    <span className="text-[var(--color-text-secondary)]">{t}</span>
                  </li>
                ))}
              </ul>
              <Button fullWidth size="lg" onClick={() => setStep(1)}>
                Mulai <ArrowRight size={18} />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold">Tentang Usahamu</h2>
              <Field label="Nama Usaha" required error={errors.name}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Warung Bu Sari"
                  invalid={!!errors.name}
                  autoFocus
                />
              </Field>
              <Field label="Jenis Usaha">
                <Select value={type} onChange={(e) => setType(e.target.value)}>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Nama Pemilik" required error={errors.owner}>
                <Input
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="Contoh: Sari Wulandari"
                  invalid={!!errors.owner}
                />
              </Field>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Kembali
                </Button>
                <Button
                  fullWidth
                  onClick={() => validateStep1() && setStep(2)}
                >
                  Lanjut <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold">Pilih Tema</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Kamu bisa mengubahnya kapan saja di Pengaturan.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLocalTheme("dark")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                    theme === "dark"
                      ? "border-[var(--color-accent-gold)] bg-[var(--color-bg-elevated)]"
                      : "border-[var(--color-border)]"
                  )}
                >
                  <Moon size={22} className="text-[var(--color-accent-gold)]" />
                  <span className="text-sm font-medium">Gelap</span>
                </button>
                <button
                  onClick={() => setLocalTheme("light")}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                    theme === "light"
                      ? "border-[var(--color-accent-gold)] bg-[var(--color-bg-elevated)]"
                      : "border-[var(--color-border)]"
                  )}
                >
                  <Sun size={22} className="text-[var(--color-accent-gold)]" />
                  <span className="text-sm font-medium">Terang</span>
                </button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Kembali
                </Button>
                <Button fullWidth loading={saving} onClick={handleFinish}>
                  Selesai <Check size={18} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
