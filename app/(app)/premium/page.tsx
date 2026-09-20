"use client";

import { useEffect, useRef, useState } from "react";
import {
  Crown,
  Check,
  Sparkles,
  Cloud,
  Users,
  FileText,
  Webhook,
  Infinity as InfinityIcon,
  MessageCircle,
  Zap,
  BarChart3,
  Shield,
  Repeat,
  Package,
  ChevronRight,
  Star,
  Smartphone,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { usePremium } from "@/lib/stores/usePremium";
import { activateLicense, removeLicense, requestTrialLicense } from "@/lib/premium/license";
import { getBusinessProfile } from "@/lib/db/queries/settings";
import { toast } from "@/lib/stores/useToastStore";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  animatePricingCards,
  cardPressDown,
  cardPressUp,
  pulseGlow,
  shineSweep,
} from "@/lib/animations/gsap";
import { getDeviceId } from "@/lib/premium/device";

// ─── Kontak & Harga ───────────────────────────────────────────────────────────

const WA_NUMBER = "6281293159011";
const DISKON_PCT = 50;
const HARGA_BULANAN_NORMAL = 75_000;
const HARGA_TAHUNAN_NORMAL = 800_000;
const HARGA_LIFETIME_NORMAL = 5_400_000;
const HARGA_BULANAN = HARGA_BULANAN_NORMAL * (1 - DISKON_PCT / 100);
const HARGA_TAHUNAN = HARGA_TAHUNAN_NORMAL * (1 - DISKON_PCT / 100);
const HARGA_LIFETIME = HARGA_LIFETIME_NORMAL * (1 - DISKON_PCT / 100);
const HEMAT_TAHUNAN = HARGA_TAHUNAN_NORMAL - HARGA_TAHUNAN;

function formatRp(n: number) {
  return "Rp" + new Intl.NumberFormat("id-ID").format(n);
}

function openWA(plan: "bulanan" | "tahunan" | "lifetime", deviceId: string) {
  const devLine = deviceId ? `\n\nDevice ID saya: ${deviceId}` : "";
  let pesan = "";
  if (plan === "bulanan") {
    pesan = `Halo, saya ingin mengambil *BIG PROMO 50%* AETHERA Premium Bulanan (${formatRp(HARGA_BULANAN)}/bln dari ${formatRp(HARGA_BULANAN_NORMAL)}). Mohon info cara pembayarannya.${devLine}`;
  } else if (plan === "tahunan") {
    pesan = `Halo, saya ingin mengambil *BIG PROMO 50%* AETHERA Premium Tahunan (${formatRp(HARGA_TAHUNAN)}/thn dari ${formatRp(HARGA_TAHUNAN_NORMAL)}). Mohon info cara pembayarannya.${devLine}`;
  } else {
    pesan = `Halo, saya ingin mengambil *BIG PROMO 50%* AETHERA Premium Lifetime (${formatRp(HARGA_LIFETIME)} dari ${formatRp(HARGA_LIFETIME_NORMAL)} — bayar sekali, pakai selamanya). Mohon info cara pembayarannya.${devLine}`;
  }
  window.open(
    `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(pesan)}`,
    "_blank"
  );
}

// ─── Data fitur ───────────────────────────────────────────────────────────────

const BENEFITS = [
  {
    icon: Sparkles,
    title: "AI Insight Bisnis",
    desc: "Analisis otomatis data omset, tren penjualan, dan rekomendasi aksi dari AI. Tahu kapan penjualan naik/turun dan kenapa.",
    color: "text-[var(--color-accent-gold)]",
    bg: "bg-[var(--color-accent-gold)]/15",
  },
  {
    icon: BarChart3,
    title: "Laporan Pajak UMKM",
    desc: "Estimasi PPh Final 0,5% otomatis per bulan. Siap lapor tanpa perlu hitung manual.",
    color: "text-[var(--color-info)]",
    bg: "bg-[var(--color-info)]/15",
  },
  {
    icon: Users,
    title: "Multi-Pengguna (Kasir)",
    desc: "Tambahkan kasir dengan PIN sendiri. Kasir bisa catat transaksi, tapi tidak bisa hapus data atau ubah pengaturan.",
    color: "text-[var(--color-success)]",
    bg: "bg-[var(--color-success)]/15",
  },
  {
    icon: Cloud,
    title: "Cloud Sync",
    desc: "Sinkronisasi data antar perangkat. Buka laporan di HP atau laptop tanpa kehilangan data.",
    color: "text-purple-400",
    bg: "bg-purple-400/15",
  },
  {
    icon: Package,
    title: "Produk Tanpa Batas",
    desc: "Paket gratis dibatasi 20 produk. Premium: tambahkan ratusan produk sesuai kebutuhan.",
    color: "text-[var(--color-warning)]",
    bg: "bg-[var(--color-warning)]/15",
  },
  {
    icon: Repeat,
    title: "Transaksi Berulang Otomatis",
    desc: "Set template untuk pengeluaran rutin (sewa, gaji, langganan). Catat sekali, jalan terus.",
    color: "text-pink-400",
    bg: "bg-pink-400/15",
  },
  {
    icon: Webhook,
    title: "Integrasi API / Webhook",
    desc: "Kirim notifikasi otomatis ke sistem lain setiap ada transaksi. Cocok untuk integrasi tools bisnis.",
    color: "text-[var(--color-text-secondary)]",
    bg: "bg-[var(--color-bg-elevated)]",
  },
  {
    icon: Shield,
    title: "Prioritas Dukungan",
    desc: "Langsung chat dengan admin via WhatsApp. Pertanyaan dijawab lebih cepat.",
    color: "text-[var(--color-success)]",
    bg: "bg-[var(--color-success)]/15",
  },
];

const FREE_VS_PREMIUM = [
  { label: "Catat penjualan & pembelian", free: true, premium: true },
  { label: "Dashboard & laporan dasar",   free: true, premium: true },
  { label: "Manajemen stok",              free: true, premium: true },
  { label: "Export PDF & CSV",            free: true, premium: true },
  { label: "Jumlah produk",               free: "Maks 20", premium: "Tanpa batas" },
  { label: "AI Insight bisnis",           free: false, premium: true },
  { label: "Laporan Pajak PPh Final",     free: false, premium: true },
  { label: "Multi-kasir dengan PIN",      free: false, premium: true },
  { label: "Cloud Sync antar perangkat",  free: false, premium: true },
  { label: "Integrasi Webhook/API",       free: false, premium: true },
  { label: "Prioritas support WhatsApp",  free: false, premium: true },
];

// ─── Komponen ─────────────────────────────────────────────────────────────────

function CheckCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") return <span className="text-xs font-medium text-[var(--color-text-secondary)]">{value}</span>;
  if (value) return <Check size={16} className="mx-auto text-[var(--color-success)]" />;
  return <span className="text-[var(--color-text-muted)]">—</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PremiumPage() {
  const { active, payload, refresh } = usePremium();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"bulanan" | "tahunan" | "lifetime">("tahunan");

  const cardsWrapRef = useRef<HTMLDivElement>(null);
  const lifetimeRef = useRef<HTMLButtonElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  const [deviceId, setDeviceId] = useState("");
  const [deviceCopied, setDeviceCopied] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  useEffect(() => { refresh(); }, [refresh]);

  // Load this device's ID — dari localStorage, hanya jalan di browser
  useEffect(() => {
    const id = getDeviceId();
    if (id) setDeviceId(id);
  }, []);

  const copyDevice = () => {
    if (!deviceId) return;
    navigator.clipboard.writeText(deviceId).catch(() => {});
    setDeviceCopied(true);
    setTimeout(() => setDeviceCopied(false), 2000);
  };

  // Animate pricing cards in on mount (only when not active)
  useEffect(() => {
    if (active) return;
    try {
      const cleanup = animatePricingCards(cardsWrapRef.current);
      return cleanup;
    } catch {
      return undefined;
    }
  }, [active]);

  // Continuous glow on lifetime card + shine sweep on CTA
  useEffect(() => {
    if (active) return;
    try {
      const stopGlow = pulseGlow(lifetimeRef.current);
      const stopShine = shineSweep(ctaRef.current);
      return () => { stopGlow(); stopShine(); };
    } catch {
      return undefined;
    }
  }, [active]);

  const selectPlan = (plan: "bulanan" | "tahunan" | "lifetime", el: HTMLButtonElement | null) => {
    setSelectedPlan(plan);
    cardPressUp(el, true);
  };

  const handleActivate = async () => {
    if (!key.trim()) { toast.error("Masukkan license key"); return; }
    setActivationError(null);
    setBusy(true);
    try {
      const status = await activateLicense(key);
      if (status.active) {
        await refresh();
        toast.success("Premium aktif! Terima kasih 🎉");
        setKey("");
      } else {
        const reason = status.reason ?? "License tidak valid";
        // Tampilkan inline di halaman — lebih reliable daripada toast saja
        setActivationError(reason);
        toast.error(reason);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat aktivasi.";
      setActivationError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    await removeLicense(); await refresh(); toast.success("Lisensi dihapus");
  };

  const handleTrial = async () => {
    setBusy(true);
    setActivationError(null);
    try {
      const profile = await getBusinessProfile();
      const trialKey = await requestTrialLicense(profile?.name ?? "Trial");
      const status = await activateLicense(trialKey);
      if (status.active) {
        await refresh();
        toast.success("Trial Premium 30 hari aktif!");
      } else {
        const reason = status.reason ?? "Trial gagal diaktifkan.";
        setActivationError(reason);
        toast.error(reason);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Trial gagal diaktifkan.";
      setActivationError(msg);
      toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <PageTransition>
      <div className="flex flex-col gap-5 pb-8">
        <PageHeader title="AETHERA Premium" subtitle="Kelola bisnis lebih cerdas" />

        {/* ── Status aktif ── */}
        {active && (
          <Card className="border-[var(--color-accent-gold)]/50 bg-[var(--color-accent-gold)]/5">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)]">
                <Crown size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-base font-bold text-[var(--color-accent-gold)]">Premium Aktif ✓</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {payload?.name} ·{" "}
                  {payload?.exp
                    ? (() => {
                        const dl = Math.ceil((payload.exp - Date.now()) / 86400000);
                        return dl > 0 ? `${dl} hari lagi (s/d ${formatDate(new Date(payload.exp))})` : `Berakhir ${formatDate(new Date(payload.exp))}`;
                      })()
                    : "Lifetime"}
                </p>
                {payload?.exp && (() => {
                  const dl = Math.ceil((payload.exp - Date.now()) / 86400000);
                  if (dl > 0 && dl <= 7) return (
                    <div className="mt-2">
                      <p className="text-xs text-[var(--color-warning)]">⚠ Berakhir dalam {dl} hari — segera perpanjang</p>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-elevated)]">
                        <div className="h-full rounded-full bg-[var(--color-warning)]" style={{ width: `${Math.round((dl/30)*100)}%` }} />
                      </div>
                    </div>
                  );
                  return null;
                })()}
              </div>
            </div>
            <Button variant="outline" className="mt-4 w-full" onClick={handleRemove}>Nonaktifkan Premium</Button>
          </Card>
        )}

        {!active && (
          <>
            {/* ── Hero banner ── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-accent-gold)] via-amber-500 to-orange-500 p-5 text-black">
              {/* Decorative rings */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              <div className="pointer-events-none absolute -bottom-6 -right-2 h-20 w-20 rounded-full bg-white/10" />

              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <Crown size={22} />
                  <span className="text-xs font-bold uppercase tracking-widest opacity-80">BIG PROMO 50% · AETHERA PREMIUM</span>
                </div>
                <h2 className="font-heading text-2xl font-extrabold leading-tight">
                  Catat lebih cepat,<br />untung lebih jelas.
                </h2>
                <p className="mt-2 text-sm opacity-80">
                  Semua yang kamu butuhkan untuk memantau bisnis — dari omset harian hingga laporan pajak tahunan.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["AI Insight", "Multi-kasir", "Laporan Pajak", "Cloud Sync"].map((f) => (
                    <span key={f} className="rounded-full bg-black/15 px-2.5 py-1 text-xs font-semibold">{f}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Pilih paket ── */}
            <div>
              <h2 className="mb-3 font-heading text-base font-bold">Pilih Paket</h2>
              <div ref={cardsWrapRef} className="flex flex-col gap-3">

                {/* Baris 1: Bulanan & Tahunan */}
                <div className="grid grid-cols-2 gap-3">

                  {/* Bulanan */}
                  <button
                    onPointerDown={(e) => cardPressDown(e.currentTarget)}
                    onPointerUp={(e) => selectPlan("bulanan", e.currentTarget)}
                    onPointerLeave={(e) => cardPressUp(e.currentTarget, selectedPlan === "bulanan")}
                    className={cn(
                      "price-card relative flex flex-col rounded-2xl border-2 p-4 text-left transition-colors duration-300 will-change-transform",
                      selectedPlan === "bulanan"
                        ? "border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/5"
                        : "border-[var(--color-border)] bg-[var(--color-bg-card)]"
                    )}
                  >
                    {selectedPlan === "bulanan" && (
                      <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[var(--color-accent-gold)] text-black">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Bulanan</p>
                    <p className="mt-1 font-heading text-2xl font-extrabold">{formatRp(HARGA_BULANAN)}</p>
                    <p className="text-xs text-[var(--color-text-muted)] line-through">{formatRp(HARGA_BULANAN_NORMAL)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">per bulan</p>
                    <p className="mt-2 text-xs font-semibold text-[var(--color-success)]">BIG PROMO · Hemat 50%</p>
                  </button>

                  {/* Tahunan */}
                  <button
                    onPointerDown={(e) => cardPressDown(e.currentTarget)}
                    onPointerUp={(e) => selectPlan("tahunan", e.currentTarget)}
                    onPointerLeave={(e) => cardPressUp(e.currentTarget, selectedPlan === "tahunan")}
                    className={cn(
                      "price-card relative flex flex-col rounded-2xl border-2 p-4 text-left transition-colors duration-300 will-change-transform",
                      selectedPlan === "tahunan"
                        ? "border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/8"
                        : "border-[var(--color-accent-gold)]/40 bg-[var(--color-bg-card)]"
                    )}
                  >
                    <span className="absolute -top-2.5 right-3 rounded-full bg-[var(--color-accent-gold)] px-2 py-0.5 text-[10px] font-extrabold text-black shadow">
                      BIG PROMO {DISKON_PCT}%
                    </span>
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold text-[var(--color-accent-gold)] uppercase tracking-wide">Tahunan</p>
                      <Star size={10} className="fill-[var(--color-accent-gold)] text-[var(--color-accent-gold)]" />
                    </div>
                    <p className="mt-1 font-heading text-2xl font-extrabold">{formatRp(HARGA_TAHUNAN)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">per tahun</p>
                    <div className="mt-2 space-y-0.5">
                      <p className="text-xs text-[var(--color-text-muted)] line-through">{formatRp(HARGA_TAHUNAN_NORMAL)}</p>
                      <p className="text-xs font-semibold text-[var(--color-success)]">
                        Hemat {formatRp(HEMAT_TAHUNAN)} selama promo!
                      </p>
                    </div>
                  </button>
                </div>

                {/* Lifetime — full width, paling menonjol */}
                <button
                  ref={lifetimeRef}
                  onPointerDown={(e) => cardPressDown(e.currentTarget)}
                  onPointerUp={(e) => selectPlan("lifetime", e.currentTarget)}
                  onPointerLeave={(e) => cardPressUp(e.currentTarget, selectedPlan === "lifetime")}
                  className={cn(
                    "price-card group relative mt-1 w-full overflow-hidden rounded-2xl border-2 p-5 text-left transition-colors duration-300 will-change-transform",
                    "bg-gradient-to-br from-purple-600/15 via-fuchsia-500/10 to-indigo-600/15",
                    selectedPlan === "lifetime"
                      ? "border-purple-400"
                      : "border-purple-400/40"
                  )}
                >
                  {/* Animated decorative blobs */}
                  <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-purple-500/20 blur-xl transition-transform duration-700 group-hover:scale-125" />
                  <div className="pointer-events-none absolute -bottom-8 right-16 h-20 w-20 rounded-full bg-fuchsia-500/20 blur-lg transition-transform duration-700 group-hover:scale-110" />

                  {selectedPlan === "lifetime" && (
                    <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-purple-400 text-white">
                      <Check size={13} strokeWidth={3} />
                    </span>
                  )}

                  <div className="relative">
                    {/* Best value ribbon — inline di dalam kartu */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-lg">
                      ⭐ Paling Worth It
                    </span>

                    <div className="mt-3 flex items-center gap-1.5">
                      <InfinityIcon size={16} className="text-purple-300" />
                      <p className="text-xs font-bold text-purple-300 uppercase tracking-widest">Lifetime Access</p>
                    </div>
                    <p className="mt-2 font-heading text-4xl font-black tracking-tight">{formatRp(HARGA_LIFETIME)}</p>
                    <p className="text-sm text-[var(--color-text-muted)] line-through">{formatRp(HARGA_LIFETIME_NORMAL)}</p>
                    <p className="mt-0.5 text-sm font-semibold text-purple-200">
                      BIG PROMO 50% · Bayar sekali, pakai seumur hidup. 🚀
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                      Sekali beli, semua fitur premium jadi milikmu selamanya — tanpa tagihan bulanan,
                      tanpa khawatir lupa perpanjang. Bisnis tumbuh, biayanya tetap nol.
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {["Tanpa tagihan berulang", "Update selamanya", "Harga naik, kamu aman"].map((tag) => (
                        <span key={tag} className="rounded-full bg-purple-500/20 px-2.5 py-1 text-[11px] font-medium text-purple-200">
                          ✓ {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              </div>

              {/* Sub-label */}
              {selectedPlan === "tahunan" && (
                <p className="mt-2 text-center text-xs text-[var(--color-text-muted)]">
                  Setara <strong className="text-[var(--color-accent-gold)]">{formatRp(Math.round(HARGA_TAHUNAN / 12))}</strong>/bulan jika dibayar tahunan
                </p>
              )}
              {selectedPlan === "lifetime" && (
                <p className="mt-2 text-center text-xs text-purple-300">
                  💎 Pilihan paling cerdas — beli sekarang, lupakan biaya langganan selamanya
                </p>
              )}
            </div>

            {/* ── CTA Pesan via WhatsApp ── */}
            <div className="flex flex-col gap-2">
              <button
                ref={ctaRef}
                onClick={() => openWA(selectedPlan, deviceId)}
                className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl px-5 py-4 text-white shadow-lg shadow-[#25D366]/30 transition-all hover:brightness-105 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(110deg, #25D366 0%, #25D366 40%, #4ce88a 50%, #25D366 60%, #25D366 100%)",
                  backgroundSize: "200% 100%",
                }}
              >
                <div className="flex items-center gap-3">
                  <MessageCircle size={22} className="shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-bold">Pesan Sekarang via WhatsApp</p>
                    <p className="text-xs opacity-90">
                      {selectedPlan === "bulanan" && `Paket Bulanan · ${formatRp(HARGA_BULANAN)}/bln`}
                      {selectedPlan === "tahunan" && `Paket Tahunan · ${formatRp(HARGA_TAHUNAN)}/thn`}
                      {selectedPlan === "lifetime" && `Paket Lifetime · ${formatRp(HARGA_LIFETIME)} sekali bayar`}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>

              <p className="text-center text-xs text-[var(--color-text-muted)]">
                Kamu akan diarahkan ke WhatsApp untuk konfirmasi & pembayaran
              </p>
            </div>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-[var(--color-border)]" />
              <span className="text-xs text-[var(--color-text-muted)]">atau coba dulu</span>
              <div className="flex-1 border-t border-[var(--color-border)]" />
            </div>

            {/* ── Trial gratis ── */}
            <Card className="border-dashed">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-bg-elevated)] text-[var(--color-accent-gold)]">
                  <Zap size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">Trial Gratis 30 Hari</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Akses semua fitur premium tanpa kartu kredit.</p>
                </div>
                <Button variant="outline" size="sm" loading={busy} onClick={handleTrial}>
                  Coba
                </Button>
              </div>
            </Card>
          </>
        )}

        {/* ── Benefit detail ── */}
        <div>
          <h2 className="mb-3 font-heading text-base font-bold">Semua yang kamu dapat</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="flex gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
                  <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", b.bg, b.color)}>
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{b.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Tabel perbandingan ── */}
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-2.5 text-xs font-bold">
            <span className="text-[var(--color-text-secondary)]">Fitur</span>
            <span className="text-center text-[var(--color-text-muted)]">Gratis</span>
            <span className="text-center text-[var(--color-accent-gold)]">Premium</span>
          </div>
          {FREE_VS_PREMIUM.map((row, i) => (
            <div key={row.label} className={cn("grid grid-cols-3 items-center px-4 py-2.5 text-xs", i % 2 === 1 && "bg-[var(--color-bg-elevated)]/40")}>
              <span className="text-[var(--color-text-secondary)]">{row.label}</span>
              <span className="flex justify-center"><CheckCell value={row.free} /></span>
              <span className="flex justify-center"><CheckCell value={row.premium} /></span>
            </div>
          ))}
        </Card>

        {/* ── CTA repeat bawah (hanya kalau belum aktif) ── */}
        {!active && (
          <button
            onClick={() => openWA(selectedPlan, deviceId)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-4 text-sm font-bold text-white shadow-lg shadow-[#25D366]/30 transition-all hover:bg-[#20BD5A] active:scale-[0.98]"
          >
            <MessageCircle size={18} />
            Berlangganan via WhatsApp
          </button>
        )}

        {/* ── Aktivasi license key ── */}
        <Card>
          <h2 className="mb-1 font-heading text-sm font-bold">Sudah punya License Key?</h2>
          <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
            Masukkan key yang kamu terima setelah pembayaran dikonfirmasi.
          </p>

          {/* Device ID — untuk dikirim ke admin saat beli */}
          <div className="mb-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3">
            <div className="flex items-center gap-2">
              <Smartphone size={15} className="shrink-0 text-[var(--color-accent-gold)]" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Device ID perangkat ini</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 select-all rounded-lg bg-[var(--color-bg-card)] px-3 py-2 font-mono text-sm font-bold tracking-wider text-[var(--color-accent-gold)]">
                {deviceId || "..."}
              </code>
              <button
                onClick={copyDevice}
                className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-medium hover:bg-[var(--color-bg-card)]"
              >
                {deviceCopied ? "✓ Tersalin" : "Salin"}
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
              Kirim Device ID ini ke admin saat membeli. License akan dikunci ke perangkat ini agar aman dan tidak bisa dipakai orang lain.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Field label="">
              <Input
                value={key}
                onChange={(e) => { setKey(e.target.value); setActivationError(null); }}
                placeholder="xxxxx.xxxxx"
              />
            </Field>

            {/* Pesan error aktivasi — ditampilkan inline, tidak bergantung pada toast */}
            {activationError && (
              <div className="rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-4 py-3">
                <p className="text-sm font-semibold text-[var(--color-danger)]">❌ Aktivasi Gagal</p>
                <p className="mt-1 text-xs text-[var(--color-danger)]/80">{activationError}</p>
                {activationError.includes("perangkat lain") && deviceId && (
                  <div className="mt-2 rounded-lg bg-[var(--color-bg-card)] px-3 py-2">
                    <p className="text-[11px] text-[var(--color-text-muted)]">Device ID kamu saat ini:</p>
                    <code className="text-xs font-bold text-[var(--color-accent-gold)]">{deviceId}</code>
                    <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                      Kirim ID ini ke admin untuk re-binding license ke perangkat baru.
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button loading={busy} onClick={handleActivate}>
              <Crown size={16} /> Aktifkan Premium
            </Button>
          </div>
        </Card>

        <p className="text-center text-xs text-[var(--color-text-muted)]">
          Pertanyaan? Chat admin di{" "}
          <button
            onClick={() => window.open(`https://wa.me/${WA_NUMBER}`, "_blank")}
            className="font-medium text-[#25D366] underline underline-offset-2"
          >
            WhatsApp
          </button>
        </p>
      </div>
    </PageTransition>
  );
}
