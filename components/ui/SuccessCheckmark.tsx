"use client";

import { useEffect, useRef } from "react";
import { animateCheckmark } from "@/lib/animations/gsap";

/** Animated checkmark SVG that draws on mount. */
export function SuccessCheckmark({ size = 48 }: { size?: number }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    animateCheckmark(ref.current);
  }, []);

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="24" cy="24" r="22" stroke="var(--color-success)" strokeWidth="2.5" opacity="0.3" />
      <polyline
        points="14,24 21,32 34,18"
        stroke="var(--color-success)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
