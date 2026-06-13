"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NAV_ITEMS } from "./navItems";
import { cn } from "@/lib/utils/cn";
import { useAppStore } from "@/lib/stores/useAppStore";
import { usePremium } from "@/lib/stores/usePremium";
import { useSession } from "@/lib/stores/useSession";

export function Sidebar() {
  const pathname = usePathname();
  const profile = useAppStore((s) => s.profile);
  const premiumActive = usePremium((s) => s.active);
  const currentUser = useSession((s) => s.currentUser);

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 lg:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-3 px-2 py-1">
        <Logo size={36} />
        <div className="leading-tight">
          <p className="font-heading text-base font-extrabold">AETHERA</p>
          <p className="text-[10px] tracking-[0.25em] text-[var(--color-accent-gold)]">
            {premiumActive ? "PREMIUM" : "UMKM"}
          </p>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto no-scrollbar">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const isPremium = item.href === "/premium";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-bg-elevated)] text-[var(--color-accent-gold)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <Icon size={19} />
              {item.label}
              {isPremium && !premiumActive && (
                <Crown size={13} className="ml-auto text-[var(--color-accent-gold)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {profile && (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{profile.name}</p>
            {premiumActive && (
              <Crown size={14} className="shrink-0 text-[var(--color-accent-gold)]" />
            )}
          </div>
          <p className="truncate text-xs text-[var(--color-text-muted)]">
            {currentUser ? `${currentUser.name} · ${currentUser.role}` : profile.owner}
          </p>
        </div>
      )}
    </aside>
  );
}
