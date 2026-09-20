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
  const lock = useLockStore((s) => s.lock);
  const refreshPremium = usePremium((s) => s.refresh);

  useEffect(() => {
    init();
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
    });
  }, [ready, lock]);

  // Process due recurring transactions once on startup.
  useEffect(() => {
    if (!ready) return;
    processDueRecurring().then((n) => {
      if (n > 0) bumpData();
    });
  }, [ready, bumpData]);

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
