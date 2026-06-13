"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/animations/gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Logo } from "@/components/Logo";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
    const tl = gsap.timeline({ onComplete: onDone });
    tl.from(logoRef.current, {
      scale: 0.6,
      opacity: 0,
      duration: 0.8,
      ease: "power2.out",
    })
      .to(logoRef.current, { scale: 1, duration: 0.3 })
      .to(rootRef.current, { opacity: 0, duration: 0.4, delay: 0.3 });
    return () => {
      tl.kill();
    };
  }, [onDone, reduced]);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[300] grid place-items-center bg-[var(--color-bg-primary)]"
    >
      <div ref={logoRef} className="flex flex-col items-center gap-4">
        <Logo size={64} />
        <div className="text-center">
          <p className="font-heading text-2xl font-extrabold tracking-tight">AETHERA</p>
          <p className="text-sm tracking-[0.3em] text-[var(--color-accent-gold)]">UMKM</p>
        </div>
      </div>
    </div>
  );
}
