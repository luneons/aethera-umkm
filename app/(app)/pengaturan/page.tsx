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
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { useAppStore, type Theme } from "@/lib/stores/useAppStore";
import { useConfirm } from "@/lib/stores/useConfirm";
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

  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [owner, setOwner] = useState("");
  const [waNumber, setWaNumber] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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
      await saveBusinessProfile({ name: name.trim(), type, owner: owner.trim() });
      await setSetting("wa_number", waNumber.trim());
      await refreshProfile();
      toast.success("Profil usaha disimpan");
    } finally {
      setSavingProfile(false);
    }
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

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const ok = await confirm({
      title: "Pulihkan data?",
      message:
        "Data saat ini akan diganti dengan isi file backup. Pastikan kamu sudah mem-backup data yang ada.",
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

  const handleSaveNotification = async () => {
    setSavingNotif(true);
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
          <Button variant="outline" onClick={handleBackup}>
            <Download size={17} /> Backup Database (.db)
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload size={17} /> Pulihkan dari File
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".db,.sqlite,application/x-sqlite3"
            className="hidden"
            onChange={handleRestoreFile}
          />
          <Button variant="danger" onClick={handleReset}>
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
