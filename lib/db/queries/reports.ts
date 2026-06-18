import { query } from "../client";
import type {
  CategoryBreakdown,
  DailySummary,
  RecentTransaction,
  TopProduct,
  TrendPoint,
} from "../types";

/** Summary of totals between two SQL datetimes (inclusive). */
export async function getSummary(from: string, to: string): Promise<DailySummary> {
  const sales = await query<{ total: number }>(
    "SELECT COALESCE(SUM(total_amount),0) AS total FROM sales WHERE transaction_at BETWEEN ? AND ?",
    [from, to]
  );
  const purchases = await query<{ total: number }>(
    "SELECT COALESCE(SUM(total_amount),0) AS total FROM purchases WHERE transaction_at BETWEEN ? AND ?",
    [from, to]
  );
  const total_penjualan = Number(sales[0]?.total ?? 0);
  const total_pembelian = Number(purchases[0]?.total ?? 0);
  return {
    total_penjualan,
    total_pembelian,
    laba: total_penjualan - total_pembelian,
  };
}

/** Daily trend (penjualan & pembelian) between two dates (YYYY-MM-DD). */
export async function getTrend(
  fromDate: string,
  toDate: string
): Promise<TrendPoint[]> {
  const sales = await query<{ tanggal: string; total: number }>(
    `SELECT date(transaction_at) AS tanggal, SUM(total_amount) AS total
     FROM sales WHERE date(transaction_at) BETWEEN ? AND ?
     GROUP BY date(transaction_at)`,
    [fromDate, toDate]
  );
  const purchases = await query<{ tanggal: string; total: number }>(
    `SELECT date(transaction_at) AS tanggal, SUM(total_amount) AS total
     FROM purchases WHERE date(transaction_at) BETWEEN ? AND ?
     GROUP BY date(transaction_at)`,
    [fromDate, toDate]
  );

  const map = new Map<string, TrendPoint>();
  // Build all days in range so the chart has no gaps.
  const start = new Date(fromDate + "T00:00:00");
  const end = new Date(toDate + "T00:00:00");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    map.set(key, { tanggal: key, penjualan: 0, pembelian: 0 });
  }
  for (const s of sales) {
    const point = map.get(s.tanggal) ?? { tanggal: s.tanggal, penjualan: 0, pembelian: 0 };
    point.penjualan = Number(s.total);
    map.set(s.tanggal, point);
  }
  for (const p of purchases) {
    const point = map.get(p.tanggal) ?? { tanggal: p.tanggal, penjualan: 0, pembelian: 0 };
    point.pembelian = Number(p.total);
    map.set(p.tanggal, point);
  }
  return Array.from(map.values()).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

export async function getRecentTransactions(limit = 5): Promise<RecentTransaction[]> {
  return query<RecentTransaction>(
    `SELECT id, 'penjualan' AS kind, product_name AS name, total_amount, transaction_at
       FROM sales
     UNION ALL
     SELECT id, 'pembelian' AS kind, item_name AS name, total_amount, transaction_at
       FROM purchases
     ORDER BY transaction_at DESC
     LIMIT ?`,
    [limit]
  );
}

export async function getCategoryBreakdown(
  table: "sales" | "purchases",
  from: string,
  to: string
): Promise<CategoryBreakdown[]> {
  return query<CategoryBreakdown>(
    `SELECT COALESCE(c.name, 'Tanpa Kategori') AS name,
            COALESCE(c.color, '#9BA3B8') AS color,
            SUM(t.total_amount) AS total
     FROM ${table} t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.transaction_at BETWEEN ? AND ?
     GROUP BY t.category_id
     ORDER BY total DESC`,
    [from, to]
  );
}

export async function getTopProducts(
  from: string,
  to: string,
  limit = 5
): Promise<TopProduct[]> {
  return query<TopProduct>(
    `SELECT product_name,
            SUM(quantity) AS total_qty,
            SUM(total_amount) AS total_omset
     FROM sales
     WHERE transaction_at BETWEEN ? AND ?
     GROUP BY product_name
     ORDER BY total_omset DESC
     LIMIT ?`,
    [from, to, limit]
  );
}

/**
 * Profit & Loss per product based on actual sale price vs the product's HPP
 * (buy_price). Falls back to 0 COGS when no matching product is found.
 */
export async function getProfitLoss(
  from: string,
  to: string
): Promise<import("../types").ProfitLossRow[]> {
  return query<import("../types").ProfitLossRow>(
    `SELECT
       s.product_name AS product_name,
       SUM(s.quantity) AS qty,
       SUM(s.total_amount) AS revenue,
       SUM(s.quantity * COALESCE(p.buy_price, 0)) AS cogs,
       SUM(s.total_amount - (s.quantity * COALESCE(p.buy_price, 0))) AS profit
     FROM sales s
     LEFT JOIN products p ON p.id = s.product_id
     WHERE s.transaction_at BETWEEN ? AND ?
     GROUP BY s.product_name
     ORDER BY profit DESC`,
    [from, to]
  );
}

/** Total COGS (HPP) for sold goods in the period. */
export async function getCOGS(from: string, to: string): Promise<number> {
  const rows = await query<{ cogs: number }>(
    `SELECT COALESCE(SUM(s.quantity * COALESCE(p.buy_price, 0)), 0) AS cogs
     FROM sales s LEFT JOIN products p ON p.id = s.product_id
     WHERE s.transaction_at BETWEEN ? AND ?`,
    [from, to]
  );
  return Number(rows[0]?.cogs ?? 0);
}

/** Sales grouped by channel. */
export async function getChannelBreakdown(
  from: string,
  to: string
): Promise<import("../types").ChannelBreakdown[]> {
  return query<import("../types").ChannelBreakdown>(
    `SELECT COALESCE(channel, 'langsung') AS channel,
            SUM(total_amount) AS total,
            COUNT(*) AS count
     FROM sales
     WHERE transaction_at BETWEEN ? AND ?
     GROUP BY COALESCE(channel, 'langsung')
     ORDER BY total DESC`,
    [from, to]
  );
}

/** Total transaction count (sales + purchases) — for gamification. */
export async function getTransactionCount(): Promise<number> {
  const rows = await query<{ c: number }>(
    `SELECT (SELECT COUNT(*) FROM sales) + (SELECT COUNT(*) FROM purchases) AS c`
  );
  return Number(rows[0]?.c ?? 0);
}

/** Sales total per weekday (0=Sunday..6=Saturday) over a date range. */
export async function getWeekdayPattern(
  from: string,
  to: string
): Promise<{ weekday: number; total: number }[]> {
  return query<{ weekday: number; total: number }>(
    `SELECT CAST(strftime('%w', transaction_at) AS INTEGER) AS weekday,
            SUM(total_amount) AS total
     FROM sales
     WHERE transaction_at BETWEEN ? AND ?
     GROUP BY weekday
     ORDER BY weekday ASC`,
    [from, to]
  );
}

/** Monthly cash flow: penjualan, pembelian, laba bersih per bulan dalam setahun */
export async function getMonthlyCashFlow(
  year: number
): Promise<{ month: number; penjualan: number; pembelian: number; laba: number }[]> {
  const from = `${year}-01-01 00:00:00`;
  const to = `${year}-12-31 23:59:59`;

  const sales = await query<{ month: number; total: number }>(
    `SELECT CAST(strftime('%m', transaction_at) AS INTEGER) AS month,
            SUM(total_amount) AS total
     FROM sales WHERE transaction_at BETWEEN ? AND ?
     GROUP BY month`,
    [from, to]
  );
  const purchases = await query<{ month: number; total: number }>(
    `SELECT CAST(strftime('%m', transaction_at) AS INTEGER) AS month,
            SUM(total_amount) AS total
     FROM purchases WHERE transaction_at BETWEEN ? AND ?
     GROUP BY month`,
    [from, to]
  );

  const map = new Map<number, { penjualan: number; pembelian: number }>();
  for (let m = 1; m <= 12; m++) map.set(m, { penjualan: 0, pembelian: 0 });
  for (const s of sales) {
    const e = map.get(s.month)!;
    e.penjualan = Number(s.total);
  }
  for (const p of purchases) {
    const e = map.get(p.month)!;
    e.pembelian = Number(p.total);
  }

  return Array.from(map.entries()).map(([month, v]) => ({
    month,
    penjualan: v.penjualan,
    pembelian: v.pembelian,
    laba: v.penjualan - v.pembelian,
  }));
}

/** Year-over-year comparison: monthly sales for two years */
export async function getYearOverYear(
  year: number
): Promise<{ month: number; thisYear: number; lastYear: number }[]> {
  const [thisYear, lastYear] = await Promise.all([
    getMonthlyCashFlow(year),
    getMonthlyCashFlow(year - 1),
  ]);
  return thisYear.map((t, i) => ({
    month: t.month,
    thisYear: t.penjualan,
    lastYear: lastYear[i]?.penjualan ?? 0,
  }));
}

/** Daily cash flow for a specific month */
export async function getDailyCashFlow(
  year: number,
  month: number
): Promise<{ date: string; penjualan: number; pembelian: number; laba: number }[]> {
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${year}-${pad(month)}-01 00:00:00`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${pad(month)}-${lastDay} 23:59:59`;

  const sales = await query<{ date: string; total: number }>(
    `SELECT date(transaction_at) AS date, SUM(total_amount) AS total
     FROM sales WHERE transaction_at BETWEEN ? AND ? GROUP BY date`,
    [from, to]
  );
  const purchases = await query<{ date: string; total: number }>(
    `SELECT date(transaction_at) AS date, SUM(total_amount) AS total
     FROM purchases WHERE transaction_at BETWEEN ? AND ? GROUP BY date`,
    [from, to]
  );

  const map = new Map<string, { penjualan: number; pembelian: number }>();
  for (let d = 1; d <= lastDay; d++) {
    const key = `${year}-${pad(month)}-${pad(d)}`;
    map.set(key, { penjualan: 0, pembelian: 0 });
  }
  for (const s of sales) {
    const e = map.get(s.date);
    if (e) e.penjualan = Number(s.total);
  }
  for (const p of purchases) {
    const e = map.get(p.date);
    if (e) e.pembelian = Number(p.total);
  }

  return Array.from(map.entries()).map(([date, v]) => ({
    date,
    penjualan: v.penjualan,
    pembelian: v.pembelian,
    laba: v.penjualan - v.pembelian,
  }));
}
