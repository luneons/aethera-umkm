"use client";

import { Target } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatRupiah } from "@/lib/utils/format";

interface Props {
  label: string;
  current: number;
  target: number;
}

export function TargetProgress({ label, current, target }: Props) {
  if (!target) return null;
  const pct = Math.max(0, Math.min(100, (current / target) * 100));
  const reached = current >= target;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-accent-cyan)]/15 text-[var(--color-accent-cyan)]">
            <Target size={16} />
          </span>
          {label}
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: reached ? "var(--color-success)" : "var(--color-text-muted)" }}
        >
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-lg font-bold">{formatRupiah(current)}</span>
        <span className="text-xs text-[var(--color-text-muted)]">
          / {formatRupiah(target)}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-elevated)]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: reached ? "var(--color-success)" : "var(--color-accent-cyan)",
          }}
        />
      </div>
      {reached && (
        <p className="mt-2 text-xs font-medium text-[var(--color-success)]">
          🎉 Target tercapai! Kerja bagus.
        </p>
      )}
    </Card>
  );
}
