"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { useAppStore } from "@/lib/stores/useAppStore";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const ready = useAppStore((s) => s.ready);
  const profile = useAppStore((s) => s.profile);

  useEffect(() => {
    if (ready && !profile) router.replace("/onboarding");
  }, [ready, profile, router]);

  return (
    <div className="flex min-h-dvh bg-[var(--color-bg-primary)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
      <TransactionForm />
      <ConfirmProvider />
    </div>
  );
}
