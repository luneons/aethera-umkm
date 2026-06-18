"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { formatRupiah } from "@/lib/utils/format";

gsap.registerPlugin(ScrollTrigger);

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ========================================================================== */
/* DASHBOARD                                                                    */
/* ========================================================================== */

/** Stagger dashboard cards in from below + animate counters. */
export function animateDashboard(container: HTMLElement): () => void {
  if (prefersReducedMotion()) return () => {};

  const ctx = gsap.context(() => {
    gsap.from(".aethera-card", {
      y: 32,
      opacity: 0,
      duration: 0.55,
      stagger: 0.08,
      ease: "power2.out",
      clearProps: "all",
    });

    const counters = container.querySelectorAll<HTMLElement>("[data-counter]");
    counters.forEach((el) => {
      const target = parseFloat(el.getAttribute("data-counter") || "0");
      const proxy = { val: 0 };
      gsap.to(proxy, {
        val: target,
        duration: 1.1,
        ease: "power2.out",
        snap: { val: 1 },
        onUpdate: () => {
          el.textContent = formatRupiah(Math.round(proxy.val));
        },
      });
    });
  }, container);

  return () => ctx.revert();
}

/* ========================================================================== */
/* GENERIC                                                                      */
/* ========================================================================== */

/** Generic stagger-in for a list/grid of elements matching a selector. */
export function animateIn(container: HTMLElement, selector: string): () => void {
  if (prefersReducedMotion()) return () => {};
  const ctx = gsap.context(() => {
    gsap.from(selector, {
      y: 20,
      opacity: 0,
      duration: 0.45,
      stagger: 0.05,
      ease: "power2.out",
      clearProps: "all",
    });
  }, container);
  return () => ctx.revert();
}

/** Horizontal shake to signal a validation error. */
export function shake(el: HTMLElement | null) {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { x: 0 },
    {
      keyframes: { x: [-6, 6, -4, 4, -2, 2, 0] },
      duration: 0.4,
      ease: "none",
    }
  );
}

/** Success pulse for a form/modal element. */
export function successPulse(el: HTMLElement | null) {
  if (!el || prefersReducedMotion()) return;
  gsap
    .timeline()
    .to(el, { scale: 0.98, duration: 0.1 })
    .to(el, { scale: 1, duration: 0.25, ease: "back.out(2)" });
}

/* ========================================================================== */
/* PAGE TRANSITIONS                                                             */
/* ========================================================================== */

/** Fade-in + slight upward shift for page content on mount. */
export function animatePageIn(el: HTMLElement | null): () => void {
  if (!el || prefersReducedMotion()) return () => {};
  const ctx = gsap.context(() => {
    gsap.from(el, {
      y: 16,
      opacity: 0,
      duration: 0.35,
      ease: "power2.out",
      clearProps: "all",
    });
  }, el);
  return () => ctx.revert();
}

/* ========================================================================== */
/* FAB / BUTTON ANIMATIONS                                                      */
/* ========================================================================== */

/** FAB press animation: scale down then back up. */
export function fabPress(el: HTMLElement | null): void {
  if (!el || prefersReducedMotion()) return;
  gsap
    .timeline()
    .to(el, { scale: 0.85, rotation: 45, duration: 0.15, ease: "power2.in" })
    .to(el, { scale: 1, rotation: 0, duration: 0.3, ease: "back.out(3)" });
}

/* ========================================================================== */
/* LIST ITEM REMOVAL                                                            */
/* ========================================================================== */

/** Slide an item out to the left and collapse its height. Returns a promise. */
export function animateRemoveItem(el: HTMLElement): Promise<void> {
  if (prefersReducedMotion()) {
    el.style.display = "none";
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    gsap
      .timeline({ onComplete: resolve })
      .to(el, { x: -80, opacity: 0, duration: 0.3, ease: "power2.in" })
      .to(el, { height: 0, padding: 0, margin: 0, overflow: "hidden", duration: 0.25, ease: "power2.inOut" });
  });
}

/* ========================================================================== */
/* SCROLL TRIGGER — Charts enter animation                                      */
/* ========================================================================== */

/** Animate chart container when scrolled into view. */
export function animateChartOnScroll(el: HTMLElement | null): () => void {
  if (!el || prefersReducedMotion()) return () => {};
  const ctx = gsap.context(() => {
    gsap.from(el, {
      y: 30,
      opacity: 0,
      duration: 0.6,
      ease: "power2.out",
      clearProps: "all",
      scrollTrigger: {
        trigger: el,
        start: "top 90%",
        once: true,
      },
    });
  }, el);
  return () => ctx.revert();
}

/* ========================================================================== */
/* CHECKMARK SVG DRAW                                                           */
/* ========================================================================== */

/** Animate a checkmark SVG path using stroke-dashoffset. */
export function animateCheckmark(svg: SVGElement | null): void {
  if (!svg || prefersReducedMotion()) return;
  const path = svg.querySelector("path, polyline");
  if (!path) return;
  const length = (path as SVGGeometryElement).getTotalLength?.() ?? 50;
  gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
  gsap.to(path, {
    strokeDashoffset: 0,
    duration: 0.5,
    ease: "power2.out",
    delay: 0.1,
  });
}

/* ========================================================================== */
/* SIDEBAR ANIMATION                                                            */
/* ========================================================================== */

export function animateSidebarOpen(el: HTMLElement | null): void {
  if (!el || prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { x: -260, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.3, ease: "power3.out" }
  );
}

export function animateSidebarClose(el: HTMLElement | null): Promise<void> {
  if (!el || prefersReducedMotion()) return Promise.resolve();
  return new Promise((resolve) => {
    gsap.to(el, {
      x: -260,
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
      onComplete: resolve,
    });
  });
}

/* ========================================================================== */
/* PRICING CARDS (Premium page)                                                 */
/* ========================================================================== */

/** Stagger pricing cards in with a slight pop + scale. */
export function animatePricingCards(container: HTMLElement | null): () => void {
  if (!container || prefersReducedMotion()) return () => {};
  const ctx = gsap.context(() => {
    gsap.from(".price-card", {
      y: 28,
      opacity: 0,
      scale: 0.94,
      duration: 0.5,
      stagger: 0.1,
      ease: "back.out(1.5)",
      clearProps: "all",
    });
  }, container);
  return () => ctx.revert();
}

/** Press-down feedback for a pricing card (call on pointer down). */
export function cardPressDown(el: HTMLElement | null): void {
  if (!el || prefersReducedMotion()) return;
  gsap.to(el, { scale: 0.96, duration: 0.12, ease: "power2.out" });
}

/** Release / select feedback for a pricing card. */
export function cardPressUp(el: HTMLElement | null, selected: boolean): void {
  if (!el || prefersReducedMotion()) return;
  if (selected) {
    gsap.timeline()
      .to(el, { scale: 1.03, duration: 0.18, ease: "power2.out" })
      .to(el, { scale: 1, duration: 0.3, ease: "elastic.out(1, 0.5)" });
  } else {
    gsap.to(el, { scale: 1, duration: 0.25, ease: "back.out(2)" });
  }
}

/** Continuous subtle glow pulse for the highlighted (lifetime) card. */
export function pulseGlow(el: HTMLElement | null): () => void {
  if (!el || prefersReducedMotion()) return () => {};
  const tween = gsap.to(el, {
    boxShadow: "0 0 28px rgba(168,85,247,0.45)",
    duration: 1.6,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });
  return () => tween.kill();
}

/** Shine sweep across a CTA button, looped. */
export function shineSweep(el: HTMLElement | null): () => void {
  if (!el || prefersReducedMotion()) return () => {};
  const tween = gsap.fromTo(
    el,
    { backgroundPositionX: "-200%" },
    { backgroundPositionX: "200%", duration: 2.4, repeat: -1, ease: "none" }
  );
  return () => tween.kill();
}

export { gsap, ScrollTrigger };
