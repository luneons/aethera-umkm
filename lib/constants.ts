import type { SalesChannel } from "@/lib/db/types";

export const SALES_CHANNELS: { value: SalesChannel; label: string; color: string }[] = [
  { value: "langsung", label: "Langsung / Toko", color: "#F5A623" },
  { value: "gofood", label: "GoFood", color: "#00AA13" },
  { value: "grabfood", label: "GrabFood", color: "#00B14F" },
  { value: "shopeefood", label: "ShopeeFood", color: "#EE4D2D" },
  { value: "whatsapp", label: "WhatsApp", color: "#25D366" },
  { value: "tokopedia", label: "Tokopedia", color: "#42B549" },
  { value: "shopee", label: "Shopee", color: "#EE4D2D" },
  { value: "lainnya", label: "Lainnya", color: "#9BA3B8" },
];

export function channelLabel(value: string | null | undefined): string {
  if (!value) return "Langsung / Toko";
  return SALES_CHANNELS.find((c) => c.value === value)?.label ?? value;
}

export function channelColor(value: string | null | undefined): string {
  if (!value) return "#9BA3B8";
  return SALES_CHANNELS.find((c) => c.value === value)?.color ?? "#9BA3B8";
}

/** Achievement definitions for gamification. */
export interface AchievementDef {
  code: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: "first_sale", title: "Penjualan Pertama", description: "Mencatat transaksi penjualan pertamamu", icon: "Sparkles" },
  { code: "first_purchase", title: "Belanja Pertama", description: "Mencatat pembelian pertamamu", icon: "ShoppingBag" },
  { code: "ten_tx", title: "Konsisten", description: "Mencatat 10 transaksi", icon: "Flame" },
  { code: "fifty_tx", title: "Rajin Mencatat", description: "Mencatat 50 transaksi", icon: "Award" },
  { code: "hundred_tx", title: "Master Pencatat", description: "Mencatat 100 transaksi", icon: "Trophy" },
  { code: "first_product", title: "Katalog Dibuka", description: "Menambahkan produk pertama", icon: "Package" },
  { code: "daily_target", title: "Target Tercapai", description: "Mencapai target omset harian", icon: "Target" },
  { code: "monthly_target", title: "Bulan Gemilang", description: "Mencapai target omset bulanan", icon: "Medal" },
  { code: "profit_day", title: "Hari Untung", description: "Laba positif dalam sehari", icon: "TrendingUp" },
];
