"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { gsap } from "@/lib/animations/gsap";
import { useToastStore, type Toast } from "@/lib/stores/useToastStore";

const icons = {
  success: <CheckCircle2 size={18} className="text-[var(--color-success)]" />,
  error: <XCircle size={18} className="text-[var(--color-danger)]" />,
  info: <Info size={18} className="text-[var(--color-info)]" />,
};

function ToastItem({ toast }: { toast: Toast }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(
        ref.current,
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: "power3.out" }
      );
    }
  }, []);
  return (
    <div
      ref={ref}
      className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3 shadow-lg"
    >
      {icons[toast.kind]}
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-[200] flex flex-col gap-2 sm:bottom-6">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
