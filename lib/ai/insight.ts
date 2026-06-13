"use client";

import { callOpenRouter } from "./openrouter";
import { saveInsight } from "@/lib/db/queries/aiInsights";
import {
  getSummary,
  getTrend,
  getTopProducts,
  getCategoryBreakdown,
  getWeekdayPattern,
  getCOGS,
} from "@/lib/db/queries/reports";
import { getLowStockProducts } from "@/lib/db/queries/products";
import { getBusinessProfile, getSetting } from "@/lib/db/queries/settings";
import { thisMonthRange, previousMonthRange, lastNDaysRange } from "@/lib/utils/ranges";
import { formatRupiah } from "@/lib/utils/format";
import { OPENROUTER_MODEL_SETTING, DEFAULT_MODEL } from "./openrouter";

const WEEKDAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Build a compact business-data summary to feed the model. */
export async function buildBusinessContext(): Promise<string> {
  const profile = await getBusinessProfile();
  const month = thisMonthRange();
  const prevMonth = previousMonthRange();
  const week = lastNDaysRange(7);

  const [thisM, prevM, top, saleCats, weekday, cogs, trend, lowStock] =
    await Promise.all([
      getSummary(month.from, month.to),
      getSummary(prevMonth.from, prevMonth.to),
      getTopProducts(month.from, month.to, 5),
      getCategoryBreakdown("sales", month.from, month.to),
      getWeekdayPattern(month.from, month.to),
      getCOGS(month.from, month.to),
      getTrend(week.fromDate, week.toDate),
      getLowStockProducts(),
    ]);

  const lines: string[] = [];
  lines.push(`Usaha: ${profile?.name ?? "UMKM"} (${profile?.type ?? "umum"})`);
  lines.push(
    `Bulan ini — Penjualan: ${formatRupiah(thisM.total_penjualan)}, Pembelian: ${formatRupiah(thisM.total_pembelian)}, Laba kotor: ${formatRupiah(thisM.laba)}, HPP barang terjual: ${formatRupiah(cogs)}`
  );
  lines.push(
    `Bulan lalu — Penjualan: ${formatRupiah(prevM.total_penjualan)}, Laba: ${formatRupiah(prevM.laba)}`
  );

  if (top.length) {
    lines.push(
      "Produk terlaris bulan ini: " +
        top.map((t) => `${t.product_name} (${formatRupiah(t.total_omset)}, ${t.total_qty} unit)`).join("; ")
    );
  }
  if (saleCats.length) {
    lines.push(
      "Penjualan per kategori: " +
        saleCats.map((c) => `${c.name}: ${formatRupiah(c.total)}`).join("; ")
    );
  }
  if (weekday.length) {
    const best = [...weekday].sort((a, b) => b.total - a.total)[0];
    lines.push(
      `Hari dengan omset tertinggi: ${WEEKDAYS[best.weekday]} (${formatRupiah(best.total)})`
    );
  }
  if (trend.length) {
    lines.push(
      "Tren 7 hari (penjualan): " +
        trend.map((t) => `${t.tanggal.slice(5)}=${Math.round(t.penjualan / 1000)}rb`).join(", ")
    );
  }
  if (lowStock.length) {
    lines.push(
      "Stok menipis: " + lowStock.map((p) => `${p.name} (sisa ${p.stock} ${p.unit})`).join("; ")
    );
  }

  return lines.join("\n");
}

/**
 * Generate an AI insight from local business data, persist it, return text.
 */
export async function generateInsight(): Promise<string> {
  const context = await buildBusinessContext();
  const model = (await getSetting(OPENROUTER_MODEL_SETTING)) || DEFAULT_MODEL;

  const system =
    "Kamu adalah konsultan bisnis UMKM Indonesia yang ramah dan praktis. " +
    "Berdasarkan data ringkas berikut, berikan analisis singkat dalam Bahasa Indonesia. " +
    "Format jawaban dengan 3 bagian: '📊 Ringkasan' (2-3 kalimat kondisi bisnis), " +
    "'💡 Insight' (2-3 poin temuan menarik dari pola data), dan " +
    "'✅ Rekomendasi' (2-3 saran tindakan konkret). " +
    "Gunakan bullet '- '. Singkat, langsung, dan tidak bertele-tele. Jangan mengulang angka mentah terlalu banyak.";

  const content = await callOpenRouter(
    [
      { role: "system", content: system },
      { role: "user", content: `Data bisnis:\n${context}` },
    ],
    { model }
  );

  await saveInsight(content, model);
  return content;
}
