"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/stores/useAppStore";
import { Toaster } from "@/components/ui/Toaster";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { SplashScreen } from "@/components/SplashScreen";
import { LockScreen } from "@/components/LockScreen";
import { startReminderChecker, stopReminderChecker } from "@/lib/utils/notifications";
import { isPinEnabled } from "@/lib/utils/appLock";
import { processDueRecurring } from "@/lib/recurringRunner";
import { useLockStore } from "@/lib/stores/useLockStore";
import { usePremium } from "@/lib/stores/usePremium";

export function Providers({ children }: { children: React.ReactNode }) {
  const init = useAppStore((s) => s.init);
  const ready = useAppStore((s) => s.ready);
  const bumpData = useAppStore((s) => s.bumpData);
  const [showSplash, setShowSplash] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const lock = useLockStore((s) => s.lock);
  const refreshPremium = usePremium((s) => s.refresh);

  useEffect(() => {
    init().catch((err) => {
      console.error("[app] gagal memulai database", err);
      setFatalError(err instanceof Error ? err.message : "Database lokal gagal dimuat");
      setShowSplash(false);
    });
  }, [init]);

  // Load premium license status.
  useEffect(() => {
    if (!ready) return;
    refreshPremium().catch((err) => {
      console.error("[premium] gagal memuat status lisensi", err);
    });
  }, [ready, refreshPremium]);

  useEffect(() => {
    // Service worker is registered via an inline script in app/layout.tsx
    // head so PWA crawlers detect it reliably. Nothing to do here.
  }, []);

  // Start the daily reminder notification checker.
  useEffect(() => {
    if (!ready) return;
    startReminderChecker();
    return () => stopReminderChecker();
  }, [ready]);

  // Lock the app on startup if a PIN is enabled.
  useEffect(() => {
    if (!ready) return;
    isPinEnabled().then((enabled) => {
      if (enabled) lock();
    }).catch((err) => {
      console.error("[security] gagal memeriksa PIN", err);
    });
  }, [ready, lock]);

  // Process due recurring transactions once on startup.
  useEffect(() => {
    if (!ready) return;
    processDueRecurring().then((n) => {
      if (n > 0) bumpData();
    }).catch((err) => {
      console.error("[recurring] gagal memproses transaksi", err);
    });
  }, [ready, bumpData]);

  if (fatalError) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--color-bg-primary)] p-6">
        <div className="w-full max-w-md rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-bg-card)] p-6 text-center">
          <h1 className="font-heading text-xl font-bold">Database tidak dapat dimuat</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{fatalError}</p>
          <button onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-[var(--color-accent-gold)] px-5 py-3 font-bold text-black">
            Muat Ulang
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      {ready && children}
      <Toaster />
      <OfflineBanner />
      <LockScreen />
    </>
  );
}
