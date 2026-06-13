"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/stores/useAppStore";
import { Logo } from "@/components/Logo";

export default function HomePage() {
  const router = useRouter();
  const ready = useAppStore((s) => s.ready);
  const profile = useAppStore((s) => s.profile);

  useEffect(() => {
    if (!ready) return;
    router.replace(profile ? "/dashboard" : "/onboarding");
  }, [ready, profile, router]);

  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="animate-pulse">
        <Logo size={56} />
      </div>
    </div>
  );
}
