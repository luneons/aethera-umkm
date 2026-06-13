"use client";

import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/constants";
import { getUnlockedAchievements } from "@/lib/db/queries/achievements";
import { cn } from "@/lib/utils/cn";

export function AchievementsGrid() {
  const [unlocked, setUnlocked] = useState<string[]>([]);

  useEffect(() => {
    getUnlockedAchievements().then(setUnlocked);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-2">
      {ACHIEVEMENTS.map((a) => {
        const isUnlocked = unlocked.includes(a.code);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Icon = (Icons as any)[a.icon] ?? Icons.Award;
        return (
          <div
            key={a.code}
            title={a.description}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
              isUnlocked
                ? "border-[var(--color-accent-gold)]/40 bg-[var(--color-accent-gold)]/5"
                : "border-[var(--color-border)] opacity-50"
            )}
          >
            <Icon
              size={22}
              className={isUnlocked ? "text-[var(--color-accent-gold)]" : "text-[var(--color-text-muted)]"}
            />
            <span className="text-[10px] font-medium leading-tight">{a.title}</span>
          </div>
        );
      })}
    </div>
  );
}
