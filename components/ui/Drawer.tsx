"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { gsap } from "@/lib/animations/gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Bottom sheet on mobile, right-side panel on larger screens.
 */
export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open || reduced) return;
    const isDesktop = window.matchMedia("(min-width: 640px)").matches;
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    gsap.fromTo(
      panelRef.current,
      isDesktop ? { x: 40, opacity: 0 } : { y: 60, opacity: 0 },
      { x: 0, y: 0, opacity: 1, duration: 0.3, ease: "power3.out" }
    );
  }, [open, reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex sm:items-stretch sm:justify-end items-end justify-center">
      <div
        ref={overlayRef}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex w-full max-h-[92dvh] flex-col rounded-t-3xl border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] sm:max-w-md sm:h-full sm:max-h-full sm:rounded-t-none sm:rounded-l-3xl sm:border-l sm:border-t-0"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-9 w-9 place-items-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4">{children}</div>
        {footer && (
          <div className="border-t border-[var(--color-border)] px-5 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
