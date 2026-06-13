"use client";

import { useEffect, useRef } from "react";
import { animatePageIn } from "@/lib/animations/gsap";

/**
 * Wraps page content and animates it in on mount (fade + upward shift).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return animatePageIn(ref.current);
  }, []);

  return <div ref={ref}>{children}</div>;
}
