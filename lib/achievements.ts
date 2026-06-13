"use client";

import { unlockAchievement } from "@/lib/db/queries/achievements";
import { getTransactionCount, getSummary } from "@/lib/db/queries/reports";
import { getProducts } from "@/lib/db/queries/products";
import { getTarget } from "@/lib/db/queries/targets";
import { todayRange, thisMonthRange } from "@/lib/utils/ranges";
import { ACHIEVEMENTS } from "@/lib/constants";
import { toast } from "@/lib/stores/useToastStore";

/**
 * Evaluate all achievement rules against current data and unlock any newly met.
 * Shows a toast for each newly unlocked achievement.
 */
export async function evaluateAchievements(): Promise<void> {
  try {
    const [count, products, today, month, dailyTarget, monthlyTarget] =
      await Promise.all([
        getTransactionCount(),
        getProducts(),
        (async () => {
          const r = todayRange();
          return getSummary(r.from, r.to);
        })(),
        (async () => {
          const r = thisMonthRange();
          return getSummary(r.from, r.to);
        })(),
        getTarget("harian"),
        getTarget("bulanan"),
      ]);

    const toUnlock: string[] = [];

    if (count >= 1) toUnlock.push("first_sale");
    if (count >= 10) toUnlock.push("ten_tx");
    if (count >= 50) toUnlock.push("fifty_tx");
    if (count >= 100) toUnlock.push("hundred_tx");
    if (products.length >= 1) toUnlock.push("first_product");
    if (today.laba > 0) toUnlock.push("profit_day");
    if (dailyTarget && today.total_penjualan >= dailyTarget.amount) toUnlock.push("daily_target");
    if (monthlyTarget && month.total_penjualan >= monthlyTarget.amount) toUnlock.push("monthly_target");

    for (const code of toUnlock) {
      const newly = await unlockAchievement(code);
      if (newly) {
        const def = ACHIEVEMENTS.find((a) => a.code === code);
        if (def) toast.success(`🏆 Pencapaian: ${def.title}`);
      }
    }
  } catch {
    /* non-critical */
  }
}
