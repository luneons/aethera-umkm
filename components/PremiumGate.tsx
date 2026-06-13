"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { usePremium, type PremiumFeature, PREMIUM_FEATURE_LABELS } from "@/lib/stores/usePremium";

/**
 * Wraps premium-only content. If not active, shows an upsell card instead.
 */
export function PremiumGate({
  feature,
  children,
}: {
  feature: PremiumFeature;
  children: React.ReactNode;
}) {
  const active = usePremium((s) => s.active);
  const checked = usePremium((s) => s.checked);

  if (!checked) return null;
  if (active) return <>{children}</>;

  return (
    <Card className="border-[var(--color-accent-gold)]/30">
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)]">
          <Crown size={26} />
        </div>
        <div>
          <h3 className="font-heading text-base font-bold">Fitur Premium</h3>
          <p className="mt-1 max-w-xs text-sm text-[var(--color-text-secondary)]">
            {PREMIUM_FEATURE_LABELS[feature]} tersedia di AETHERA Premium.
          </p>
        </div>
        <Link href="/premium">
          <Button>
            <Crown size={16} /> Upgrade ke Premium
          </Button>
        </Link>
      </div>
    </Card>
  );
}

/** Small inline badge shown next to premium features. */
export function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-gold)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--color-accent-gold)]">
      <Crown size={10} /> PREMIUM
    </span>
  );
}
