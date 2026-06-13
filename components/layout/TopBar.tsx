"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Logo } from "@/components/Logo";
import { MobileMenu } from "./MobileMenu";

export function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/95 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Buka menu"
          className="grid h-9 w-9 place-items-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Logo size={26} />
          <span className="font-heading text-sm font-bold">AETHERA</span>
        </div>
        {/* Spacer for visual centering */}
        <div className="h-9 w-9" />
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
