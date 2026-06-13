"use client";

import { WifiOff } from "lucide-react";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";

export function OfflineBanner() {
  const isOnline = useOfflineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[90] bg-[var(--color-accent-gold)]/95 backdrop-blur-sm">
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-black">
        <WifiOff size={14} />
        <span>Mode Offline — Data tersimpan lokal, tetap bisa digunakan</span>
      </div>
    </div>
  );
}
