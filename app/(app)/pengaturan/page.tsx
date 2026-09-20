"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Palette,
  Database,
  Info,
  Download,
  Upload,
  Trash2,
  Moon,
  Sun,
  Monitor,
  Bell,
  BellOff,
  ImagePlus,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useAppStore, type Theme } from "@/lib/stores/useAppStore";
import { useConfirm } from "@/lib/stores/useConfirm";
import { useSession } from "@/lib/stores/useSession";
import { toast } from "@/lib/stores/useToastStore";
import { saveBusinessProfile, setSetting, getSetting } from "@/lib/db/queries/settings";
import { exportDatabase, importDatabase, resetDatabase } from "@/lib/db/client";
import {
  requestNotificationPermission,
  getPermissionState,
  getReminderTime,
  isReminderEnabled,
  setReminderSettings,
} from "@/lib/utils/notifications";
import { TargetSettings } from "@/components/settings/TargetSettings";
import { AiSettings } from "@/components/settings/AiSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { CloudSyncSettings } from "@/components/settings/CloudSyncSettings";
import { QrisSettings } from "@/components/settings/QrisSettings";
import { WebhookSettings } from "@/components/settings/WebhookSettings";
import { AchievementsGrid } from "@/components/AchievementsGrid";
import { PremiumGate } from "@/components/PremiumGate";
import { SeedButton } from "@/components/SeedButton";
import { cn } from "@/lib/utils/cn";
import { animatePageIn } from "@/lib/animations/gsap";
import { Trophy } from "lucide-react";

const THEMES: { key: Theme; label: string; icon: typeof Moon }[] = [
  { key: "dark", label: "Gelap", icon: Moon },
  { key: "light", label: "Terang", icon: Sun },
  { key: "system", label: "Sistem", icon: Monitor },
];

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

export default function PengaturanPage() {
  const profile = useAppStore((s) => s.profile);
  const refreshProfile = useAppStore((s) => s.refreshProfile);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const bumpData = useAppStore((s) => s.bumpData);
  const confirm = useConfirm((s) => s.confirm);
  const canManageBusiness = useSession((s) => s.canManageBusiness());

  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [owner, setOwner] = useState("");
  const [waNumber, setWaNumber] = useState("");
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Notification state
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifTime, setNotifTime] = useState("20:00");
  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [savingNotif, setSavingNotif] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setType(profile.type ?? "");
      setOwner(profile.owner ?? "");
      setLogoBase64((profile as { logo_base64?: string | null }).logo_base64 ?? null);
    }
  }, [profile]);

  useEffect(() => {
    getSetting("wa_number").then((v) => v && setWaNumber(v));
  }, []);

  useEffect(() => {
    // Load notification settings
    (async () => {
      const enabled = await isReminderEnabled();
      const time = await getReminderTime();
      setNotifEnabled(enabled);
      if (time) setNotifTime(time);
      setNotifPermission(getPermissionState());
    })();
  }, []);

  // Page in animation
  useEffect(() => {
    return animatePageIn(pageRef.current);
  }, []);

  const handleSaveProfile = async () => {
    if (!name.trim() || !owner.trim()) {
      toast.error("Nama usaha dan pemilik wajib diisi");
      return;
    }
    setSavingProfile(true);
    try {
      await saveBusinessProfile({ name: name.trim(), type, owner: owner.trim(), logoBase64: logoBase64 ?? undefined } as Parameters<typeof saveBusinessProfile>[0]);
      await setSetting("wa_number", waNumber.trim());
      await refreshProfile();
      toast.success("Profil usaha disimpan");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    if (file.size > 500 * 1024) { toast.error("Ukuran logo maks 500 KB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setLogoBase64(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleBackup = async () => {
    const data = await exportDatabase();
    const blob = new Blob([data.slice(0)], { type: "application/x-sqlite3" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aethera-backup-${new Date().toISOString().slice(0, 10)}.db`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Backup berhasil diunduh");
  };

  const handleJoinWhatsApp = () => {
    window.open(
      "https://chat.whatsapp.com/JLjGz7U14FuFVwDtNA6cQU",
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Ukuran file backup maksimal 50 MB");
      return;
    }
    if (!/\.(db|sqlite)$/i.test(file.name)) {
      toast.error("File harus berformat .db atau .sqlite");
      return;
    }
    const ok = await confirm({
      title: "Pulihkan data?",
      message:
        "Data saat ini akan diganti dengan isi file backup. Backup keamanan lokal akan dibuat otomatis sebelum restore.",
      confirmLabel: "Pulihkan",
      danger: false,
    });
    if (!ok) return;
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      await importDatabase(buf);
      await refreshProfile();
      bumpData();
      toast.success("Data berhasil dipulihkan");
    } catch {
      toast.error("File backup tidak valid");
    }
  };

  const handleReset = async () => {
    const ok1 = await confirm({
      title: "Reset semua data?",
      message:
        "Seluruh transaksi, produk, dan profil akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.",
      confirmLabel: "Lanjutkan",
    });
    if (!ok1) return;
    const ok2 = await confirm({
      title: "Konfirmasi sekali lagi",
      message: "Yakin ingin menghapus SEMUA data? Disarankan backup terlebih dahulu.",
      confirmLabel: "Hapus Semua",
    });
    if (!ok2) return;
    await resetDatabase();
    await refreshProfile();
    bumpData();
    toast.success("Semua data telah direset");
    window.location.href = "/onboarding";
  };

  const handleSaveNotification = async () => {    setSavingNotif(true);
    try {
      if (notifEnabled && notifPermission !== "granted") {
        const perm = await requestNotificationPermission();
        setNotifPermission(perm);
        if (perm === "denied") {
          toast.error("Izin notifikasi ditolak oleh browser. Aktifkan di pengaturan perangkat.");
          setNotifEnabled(false);
          await setReminderSettings(false, notifTime);
          return;
        }
      }
      await setReminderSettings(notifEnabled, notifTime);
      toast.success(notifEnabled ? `Pengingat diatur pukul ${notifTime}` : "Pengingat dinonaktifkan");
    } finally {
      setSavingNotif(false);
    }
  };

  return (
    <div ref={pageRef} className="flex flex-col gap-5">
      <PageHeader title="Pengaturan" subtitle="Kelola akun & aplikasi" />

      {/* Profile */}
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-bold">
          <Building2 size={18} className="text-[var(--color-accent-gold)]" /> Profil
          Usaha
        </h2>
        <div className="flex flex-col gap-3">
          {/* Logo upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {logoBase64 ? (
                <img src={logoBase64} alt="Logo usaha" className="h-16 w-16 rounded-xl object-cover border border-[var(--color-border)]" />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
                  <ImagePlus size={20} />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">Logo Usaha</p>
              <div className="flex gap-2">
                <button
                  onClick={() => logoRef.current?.click()}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-bg-elevated)]"
                >
                  {logoBase64 ? "Ganti Logo" : "Upload Logo"}
                </button>
                {logoBase64 && (
                  <button
                    onClick={() => setLogoBase64(null)}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-bg-elevated)]"
                  >
                    Hapus
                  </button>
                )}
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">JPG/PNG, maks 500 KB</p>
            </div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
          </div>

          <Field label="Nama Usaha" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Jenis Usaha">
            <Input value={type} onChange={(e) => setType(e.target.value)} />
          </Field>
          <Field label="Nama Pemilik" required>
            <Input value={owner} onChange={(e) => setOwner(e.target.value)} />
          </Field>
          <Field label="Nomor WhatsApp" hint="Untuk berbagi laporan (cth: 628123456789)">
            <Input
              value={waNumber}
              onChange={(e) => setWaNumber(e.target.value)}
              placeholder="628..."
              inputMode="tel"
            />
          </Field>
          <Button loading={savingProfile} onClick={handleSaveProfile}>
            Simpan Profil
          </Button>
        </div>
      </Card>

      {/* Theme */}
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-bold">
          <Palette size={18} className="text-[var(--color-accent-gold)]" /> Tampilan
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
                  theme === t.key
                    ? "border-[var(--color-accent-gold)] bg-[var(--color-bg-elevated)]"
                    : "border-[var(--color-border)]"
                )}
              >
                <Icon size={20} className="text-[var(--color-accent-gold)]" />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Targets */}
      <TargetSettings />

      {/* AI Insight (premium) */}
      <PremiumGate feature="ai_insight">
        <AiSettings />
      </PremiumGate>

      {/* QRIS */}
      <QrisSettings />

      {/* Achievements */}
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-bold">
          <Trophy size={18} className="text-[var(--color-accent-gold)]" /> Pencapaian
        </h2>
        <AchievementsGrid />
      </Card>

      {/* Notifications */}
      <Card>
        <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold">
          <Bell size={18} className="text-[var(--color-accent-gold)]" /> Pengingat
          Harian
        </h2>
        <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
          Ingatkan kamu untuk mencatat transaksi setiap hari pada waktu yang ditentukan.
        </p>

        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              {notifEnabled ? (
                <Bell size={16} className="text-[var(--color-accent-gold)]" />
              ) : (
                <BellOff size={16} className="text-[var(--color-text-muted)]" />
              )}
              Aktifkan Pengingat
            </span>
            <input
              type="checkbox"
              checked={notifEnabled}
              onChange={(e) => setNotifEnabled(e.target.checked)}
              className="h-5 w-5 accent-[var(--color-accent-gold)]"
            />
          </label>

          {notifEnabled && (
            <Field label="Jam Pengingat" hint="Notifikasi dikirim sekali sehari pada jam ini">
              <Input
                type="time"
                value={notifTime}
                onChange={(e) => setNotifTime(e.target.value)}
              />
            </Field>
          )}

          {notifPermission === "denied" && notifEnabled && (
            <p className="text-xs text-[var(--color-danger)]">
              ⚠ Izin notifikasi browser ditolak. Buka pengaturan perangkat untuk mengaktifkan kembali.
            </p>
          )}

          <Button loading={savingNotif} onClick={handleSaveNotification}>
            Simpan Pengaturan Pengingat
          </Button>
        </div>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-bold">
          <Database size={18} className="text-[var(--color-accent-gold)]" /> Data &
          Privasi
        </h2>
        <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
          Semua data tersimpan lokal di perangkatmu. Backup berkala untuk menghindari
          kehilangan data.
        </p>
        <div className="flex flex-col gap-2">
          {!canManageBusiness && (
            <p className="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-[var(--color-warning)]">
              Hanya pemilik yang dapat melakukan backup, restore, dan reset data.
            </p>
          )}
          <Button variant="outline" disabled={!canManageBusiness} onClick={handleBackup}>
            <Download size={17} /> Backup Database (.db)
          </Button>
          <Button variant="outline" disabled={!canManageBusiness} onClick={() => fileRef.current?.click()}>
            <Upload size={17} /> Pulihkan dari File
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".db,.sqlite,application/x-sqlite3"
            className="hidden"
            onChange={handleRestoreFile}
          />
          <Button variant="danger" disabled={!canManageBusiness} onClick={handleReset}>
            <Trash2 size={17} /> Reset Semua Data
          </Button>
        </div>
      </Card>

      {/* Security (PIN) */}
      <SecuritySettings />

      {/* Cloud Sync (premium) */}
      <PremiumGate feature="cloud_sync">
        <CloudSyncSettings />
      </PremiumGate>

      {/* Webhook / API (premium) */}
      <PremiumGate feature="webhook">
        <WebhookSettings />
      </PremiumGate>

      {/* Demo Data */}
      <SeedButton onDone={() => bumpData()} />

      {/* Community */}
      <Card className="overflow-hidden border-[#25D366]/30 bg-[#25D366]/5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#25D366]/15 text-[#25D366]">
            <MessageCircle size={21} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-base font-bold">Komunitas AETHERA</h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Gabung grup WhatsApp untuk mendapatkan informasi terbaru, bantuan, dan berdiskusi dengan pengguna AETHERA lainnya.
            </p>
          </div>
        </div>
        <Button
          className="mt-4 w-full bg-[#25D366] text-white hover:bg-[#20BD5A]"
          onClick={handleJoinWhatsApp}
        >
          <MessageCircle size={17} /> Gabung Grup WhatsApp <ExternalLink size={14} />
        </Button>
      </Card>

      {/* About */}
      <Card>
        <h2 className="mb-2 flex items-center gap-2 font-heading text-base font-bold">
          <Info size={18} className="text-[var(--color-accent-gold)]" /> Tentang
        </h2>
        <div className="flex flex-col gap-1 text-sm text-[var(--color-text-secondary)]">
          <div className="flex justify-between">
            <span>Aplikasi</span>
            <span className="font-medium text-[var(--color-text-primary)]">
              AETHERA UMKM
            </span>
          </div>
          <div className="flex justify-between">
            <span>Versi</span>
            <span className="font-medium text-[var(--color-text-primary)]">
              {APP_VERSION}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Mode</span>
            <span className="font-medium text-[var(--color-text-primary)]">
              Offline-first (PWA)
            </span>
          </div>
          <div className="flex justify-between">
            <span>Fase</span>
            <span className="font-medium text-[var(--color-text-primary)]">
              v2.0 — Fase 1-4 Lengkap
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Dibuat untuk membantu UMKM Indonesia mencatat omset dengan mudah. Data tidak
          pernah dikirim ke server.
        </p>
      </Card>
    </div>
  );
}
