"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Delete } from "lucide-react";
import { Logo } from "@/components/Logo";
import { verifyPin } from "@/lib/utils/appLock";
import { useLockStore } from "@/lib/stores/useLockStore";
import { shake } from "@/lib/animations/gsap";

export function LockScreen() {
  const locked = useLockStore((s) => s.locked);
  const unlock = useLockStore((s) => s.unlock);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!locked) setPin("");
  }, [locked]);

  useEffect(() => {
    if (pin.length === 6) {
      verifyPin(pin).then((ok) => {
        if (ok) {
          unlock();
        } else {
          setError(true);
          shake(dotsRef.current);
          setTimeout(() => {
            setPin("");
            setError(false);
          }, 500);
        }
      });
    }
  }, [pin, unlock]);

  if (!locked) return null;

  const press = (digit: string) => {
    if (pin.length < 6) setPin((p) => p + digit);
  };
  const backspace = () => setPin((p) => p.slice(0, -1));

  return (
    <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center gap-8 bg-[var(--color-bg-primary)] px-6">
      <div className="flex flex-col items-center gap-3">
        <Logo size={48} />
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <Lock size={15} />
          <span className="text-sm">Masukkan PIN</span>
        </div>
      </div>

      <div ref={dotsRef} className="flex gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="h-3.5 w-3.5 rounded-full border-2 transition-colors"
            style={{
              borderColor: error
                ? "var(--color-danger)"
                : i < pin.length
                ? "var(--color-accent-gold)"
                : "var(--color-border)",
              background: i < pin.length
                ? error
                  ? "var(--color-danger)"
                  : "var(--color-accent-gold)"
                : "transparent",
            }}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="grid h-16 w-16 place-items-center rounded-full border border-[var(--color-border)] text-xl font-semibold transition-colors hover:bg-[var(--color-bg-elevated)] active:scale-95"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => press("0")}
          className="grid h-16 w-16 place-items-center rounded-full border border-[var(--color-border)] text-xl font-semibold transition-colors hover:bg-[var(--color-bg-elevated)] active:scale-95"
        >
          0
        </button>
        <button
          onClick={backspace}
          aria-label="Hapus"
          className="grid h-16 w-16 place-items-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
        >
          <Delete size={22} />
        </button>
      </div>
    </div>
  );
}
