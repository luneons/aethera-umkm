"use client";

import { formatRupiah, formatDate } from "./format";
import type { DailySummary, TopProduct } from "@/lib/db/types";

/** Open WhatsApp with a prefilled message (deep link). */
export function shareToWhatsApp(message: string, phone?: string) {
  const base = phone
    ? `https://wa.me/${phone.replace(/[^\d]/g, "")}`
    : "https://wa.me/";
  const url = `${base}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Build a daily summary message for sharing. */
export function buildDailySummaryMessage(
  businessName: string,
  summary: DailySummary,
  top: TopProduct[],
  date = new Date()
): string {
  const lines: string[] = [];
  lines.push(`*${businessName}*`);
  lines.push(`📅 Ringkasan ${formatDate(date)}`);
  lines.push("");
  lines.push(`💰 Penjualan: *${formatRupiah(summary.total_penjualan)}*`);
  lines.push(`🛒 Pembelian: ${formatRupiah(summary.total_pembelian)}`);
  lines.push(`📊 Laba estimasi: *${formatRupiah(summary.laba)}*`);
  if (top.length) {
    lines.push("");
    lines.push("🏆 Terlaris hari ini:");
    top.slice(0, 3).forEach((t, i) => {
      lines.push(`${i + 1}. ${t.product_name} — ${formatRupiah(t.total_omset)}`);
    });
  }
  lines.push("");
  lines.push("_Dikirim via AETHERA UMKM_");
  return lines.join("\n");
}
