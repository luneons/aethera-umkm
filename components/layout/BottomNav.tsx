"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { MOBILE_NAV } from "./navItems";
import { cn } from "@/lib/utils/cn";
import { useTxDrawer } from "@/lib/stores/useTxDrawer";

export function BottomNav() {
  const pathname = usePathname();
  const openDrawer = useTxDrawer((s) => s.openDrawer);

  const left = MOBILE_NAV.slice(0, 2);
  const right = MOBILE_NAV.slice(2);

  const renderItem = (item: (typeof MOBILE_NAV)[number]) => {
    const active =
      pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
          active ? "text-[var(--color-accent-gold)]" : "text-[var(--color-text-muted)]"
        )}
      >
        <Icon size={20} />
        {item.label}
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]/95 backdrop-blur-md lg:hidden">
      <div className="relative mx-auto flex max-w-lg items-center px-2 pb-[env(safe-area-inset-bottom)]">
        {left.map(renderItem)}

        {/* Center FAB */}
        <div className="flex w-16 shrink-0 justify-center">
          <button
            onClick={() => openDrawer("penjualan")}
            aria-label="Catat transaksi"
            className="absolute -top-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--color-accent-gold)] text-black shadow-lg shadow-black/30 transition-transform active:scale-95"
          >
            <Plus size={26} />
          </button>
        </div>

        {right.map(renderItem)}
      </div>
    </nav>
  );
}
