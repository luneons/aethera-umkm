"use client";

import { create } from "zustand";
import { getStoredLicense, type LicensePayload } from "@/lib/premium/license";

export type PremiumFeature =
  | "ai_insight"
  | "cloud_sync"
  | "multi_user"
  | "tax_report"
  | "webhook"
  | "unlimited_products";

/** Features available on the free tier; everything else needs premium. */
export const FREE_FEATURES: PremiumFeature[] = [];

/** Free-tier limit on number of products. */
export const FREE_PRODUCT_LIMIT = 20;

interface PremiumState {
  active: boolean;
  payload: LicensePayload | null;
  checked: boolean;
  refresh: () => Promise<void>;
  has: (feature: PremiumFeature) => boolean;
}

export const usePremium = create<PremiumState>((set, get) => ({
  active: false,
  payload: null,
  checked: false,
  refresh: async () => {
    const status = await getStoredLicense();
    set({ active: status.active, payload: status.payload, checked: true });
  },
  has: (feature) => {
    if (FREE_FEATURES.includes(feature)) return true;
    return get().active;
  },
}));

export const PREMIUM_FEATURE_LABELS: Record<PremiumFeature, string> = {
  ai_insight: "AI Insight",
  cloud_sync: "Cloud Sync antar perangkat",
  multi_user: "Multi-pengguna (kasir & pemilik)",
  tax_report: "Laporan Pajak UMKM",
  webhook: "Integrasi API / Webhook",
  unlimited_products: "Produk tanpa batas",
};
