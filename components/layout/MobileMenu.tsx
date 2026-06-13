"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NAV_ITEMS } from "./navItems";
import { cn } from "@/lib/utils/cn";
import { animateSidebarOpen, animateSidebarClose } from "@/lib/animations/gsap";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: Props) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      animateSidebarOpen(panelRef.current);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    // Close on route change
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleClose = async () => {
    await animateSidebarClose(panelRef.current);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div
        ref={panelRef}
        className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
      >
        <div className="mb-5 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Logo size={32} />
            <span className="font-heading text-base font-extrabold">AETHERA</span>
          </Link>
          <button
            onClick={handleClose}
            aria-label="Tutup menu"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
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
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
