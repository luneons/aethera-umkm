"use client";

import { useEffect, useState } from "react";
import { FileDown, FileText, Trophy, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Input";
import { TrendChart } from "@/components/charts/TrendChart";
import { ComparisonBarChart } from "@/components/charts/ComparisonBarChart";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { useAppStore } from "@/lib/stores/useAppStore";
import { toast } from "@/lib/stores/useToastStore";
import { formatRupiah } from "@/lib/utils/format";
import {
  lastNDaysRange,
  thisWeekRange,
  thisMonthRange,
  previousMonthRange,
  customRange,
  type Range,
} from "@/lib/utils/ranges";
import {
  getSummary,
  getTrend,
  getCategoryBreakdown,
  getTopProducts,
  getProfitLoss,
  getChannelBreakdown,
  getCOGS,
} from "@/lib/db/queries/reports";
import { getSales } from "@/lib/db/queries/sales";
import { getPurchases } from "@/lib/db/queries/purchases";
import { exportReportPDF, exportReportCSV } from "@/lib/utils/export";
import { channelLabel, channelColor } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import type {
  DailySummary,
  TrendPoint,
  CategoryBreakdown,
  TopProduct,
  ProfitLossRow,
  ChannelBreakdown,
} from "@/lib/db/types";

type Tab = "harian" | "mingguan" | "bulanan" | "kustom";

const TABS: { key: Tab; label: string }[] = [
  { key: "harian", label: "Harian" },
  { key: "mingguan", label: "Mingguan" },
  { key: "bulanan", label: "Bulanan" },
  { key: "kustom", label: "Kustom" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function LaporanPage() {
  const profile = useAppStore((s) => s.profile);
  const [tab, setTab] = useState<Tab>("mingguan");
  const [customFrom, setCustomFrom] = useState(todayStr());
  const [customTo, setCustomTo] = useState(todayStr());

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [prevSummary, setPrevSummary] = useState<DailySummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [saleCats, setSaleCats] = useState<CategoryBreakdown[]>([]);
  const [buyCats, setBuyCats] = useState<CategoryBreakdown[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [pnl, setPnl] = useState<ProfitLossRow[]>([]);
  const [channels, setChannels] = useState<ChannelBreakdown[]>([]);
  const [cogs, setCogs] = useState(0);
  const [exporting, setExporting] = useState(false);

  function resolveRange(): { range: Range; label: string; prev?: Range } {
    switch (tab) {
      case "harian":
        return { range: lastNDaysRange(1), label: "Hari ini" };
      case "mingguan":
        return { range: thisWeekRange(), label: "Minggu ini" };
      case "bulanan":
        return {
          range: thisMonthRange(),
          label: "Bulan ini",
          prev: previousMonthRange(),
        };
      case "kustom":
        return {
          range: customRange(customFrom, customTo),
          label: `${customFrom} s/d ${customTo}`,
        };
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    const { range, prev } = resolveRange();
    const trendRange =
      tab === "harian"
        ? lastNDaysRange(7)
        : tab === "mingguan"
        ? thisWeekRange()
        : tab === "bulanan"
        ? thisMonthRange()
        : customRange(customFrom, customTo);

    Promise.all([
      getSummary(range.from, range.to),
      prev ? getSummary(prev.from, prev.to) : Promise.resolve(null),
      getTrend(trendRange.fromDate, trendRange.toDate),
      getCategoryBreakdown("sales", range.from, range.to),
      getCategoryBreakdown("purchases", range.from, range.to),
      getTopProducts(range.from, range.to, 5),
      getProfitLoss(range.from, range.to),
      getChannelBreakdown(range.from, range.to),
      getCOGS(range.from, range.to),
    ]).then(([s, ps, tr, sc, bc, tp, pl, ch, cg]) => {
      if (!active) return;
      setSummary(s);
      setPrevSummary(ps);
      setTrend(tr);
      setSaleCats(sc);
      setBuyCats(bc);
      setTop(tp);
      setPnl(pl);
      setChannels(ch);
      setCogs(cg);
      setLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, customFrom, customTo]);

  const handleExport = async (kind: "pdf" | "csv") => {
    setExporting(true);
    try {
      const { range, label } = resolveRange();
      const [sales, purchases] = await Promise.all([
        getSales({ from: range.from, to: range.to, sort: "newest" }),
        getPurchases({ from: range.from, to: range.to, sort: "newest" }),
      ]);
      if (sales.length === 0 && purchases.length === 0) {
        toast.error("Tidak ada data untuk diekspor");
        return;
      }
      if (kind === "pdf") {
        exportReportPDF(
          {
            businessName: profile?.name ?? "Usaha Saya",
            owner: profile?.owner,
            periodLabel: label,
            totalSales: summary?.total_penjualan ?? 0,
            totalPurchases: summary?.total_pembelian ?? 0,
          },
          sales,
          purchases
        );
      } else {
        exportReportCSV(sales, purchases);
      }
      toast.success(`Laporan ${kind.toUpperCase()} berhasil diunduh`);
    } catch (e) {
      console.error(e);
      toast.error("Gagal mengekspor laporan");
    } finally {
      setExporting(false);
    }
  };

  const labaPrevDelta =
    prevSummary && prevSummary.laba !== 0
      ? ((summary!.laba - prevSummary.laba) / Math.abs(prevSummary.laba)) * 100
      : null;

  return (
    <PageTransition>
    <div className="flex flex-col gap-5">
      <PageHeader title="Laporan" subtitle="Insight bisnis berbasis data" />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-[var(--color-accent-gold)] text-black"
                : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "kustom" && (
        <Card className="grid grid-cols-2 gap-3">
          <Field label="Dari">
            <Input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </Field>
          <Field label="Sampai">
            <Input
              type="date"
              value={customTo}
              min={customFrom}
              max={todayStr()}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </Field>
        </Card>
      )}

      {loading ? (
        <>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <p className="text-xs text-[var(--color-text-secondary)]">Penjualan</p>
              <p className="mt-1 text-base font-bold text-[var(--color-success)] sm:text-lg">
                {formatRupiah(summary?.total_penjualan ?? 0, false)}
              </p>
            </Card>
            <Card className="text-center">
              <p className="text-xs text-[var(--color-text-secondary)]">Pembelian</p>
              <p className="mt-1 text-base font-bold text-[var(--color-danger)] sm:text-lg">
                {formatRupiah(summary?.total_pembelian ?? 0, false)}
              </p>
            </Card>
            <Card className="text-center">
              <p className="text-xs text-[var(--color-text-secondary)]">Laba</p>
              <p className="mt-1 text-base font-bold text-[var(--color-accent-gold)] sm:text-lg">
                {formatRupiah(summary?.laba ?? 0, false)}
              </p>
            </Card>
          </div>

          {labaPrevDelta !== null && (
            <p className="-mt-2 text-center text-xs text-[var(--color-text-muted)]">
              Laba {labaPrevDelta >= 0 ? "naik" : "turun"}{" "}
              <span
                style={{
                  color:
                    labaPrevDelta >= 0
                      ? "var(--color-success)"
                      : "var(--color-danger)",
                }}
              >
                {Math.abs(labaPrevDelta).toFixed(0)}%
              </span>{" "}
              dibanding bulan lalu
            </p>
          )}

          {/* Export */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              loading={exporting}
              onClick={() => handleExport("pdf")}
            >
              <FileText size={17} /> Ekspor PDF
            </Button>
            <Button
              variant="outline"
              fullWidth
              loading={exporting}
              onClick={() => handleExport("csv")}
            >
              <FileDown size={17} /> Ekspor CSV
            </Button>
          </div>

          {/* Trend / Comparison chart */}
          <Card>
            <h2 className="mb-2 font-heading text-base font-bold">
              {tab === "bulanan" ? "Tren Harian Bulan Ini" : "Tren Penjualan vs Pembelian"}
            </h2>
            {trend.some((t) => t.penjualan || t.pembelian) ? (
              tab === "harian" ? (
                <TrendChart data={trend} height={220} />
              ) : (
                <ComparisonBarChart data={trend} height={260} />
              )
            ) : (
              <EmptyState
                icon={BarChart3}
                title="Belum ada data"
                description="Catat transaksi pada periode ini untuk melihat grafik."
              />
            )}
          </Card>

          {/* Top products */}
          {top.length > 0 && (
            <Card>
              <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-bold">
                <Trophy size={17} className="text-[var(--color-accent-gold)]" /> Produk
                Terlaris
              </h2>
              <ul className="flex flex-col gap-2">
                {top.map((p, i) => (
                  <li key={p.product_name} className="flex items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--color-bg-elevated)] text-xs font-bold text-[var(--color-accent-gold)]">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.product_name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {p.total_qty} terjual
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--color-success)]">
                      {formatRupiah(p.total_omset)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Profit & Loss */}
          {pnl.length > 0 && (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-heading text-base font-bold">Laba Rugi (per Produk)</h2>
              </div>
              <div className="mb-3 grid grid-cols-3 gap-2 rounded-xl bg-[var(--color-bg-elevated)] p-3 text-center">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">Omset</p>
                  <p className="text-sm font-bold text-[var(--color-success)]">
                    {formatRupiah(summary?.total_penjualan ?? 0, false)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">HPP</p>
                  <p className="text-sm font-bold text-[var(--color-danger)]">
                    {formatRupiah(cogs, false)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">Laba Kotor</p>
                  <p className="text-sm font-bold text-[var(--color-accent-gold)]">
                    {formatRupiah((summary?.total_penjualan ?? 0) - cogs, false)}
                  </p>
                </div>
              </div>
              <ul className="flex flex-col divide-y divide-[var(--color-border)]">
                {pnl.slice(0, 8).map((row) => (
                  <li key={row.product_name} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.product_name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {row.qty} unit · omset {formatRupiah(row.revenue, false)}
                      </p>
                    </div>
                    <span
                      className="shrink-0 text-sm font-semibold"
                      style={{
                        color: row.profit >= 0 ? "var(--color-success)" : "var(--color-danger)",
                      }}
                    >
                      {formatRupiah(row.profit)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Channel breakdown */}
          {channels.length > 0 && (
            <Card>
              <h2 className="mb-3 font-heading text-base font-bold">Omset per Saluran</h2>
              <ul className="flex flex-col gap-2">
                {channels.map((ch) => {
                  const totalAll = channels.reduce((s, c) => s + c.total, 0);
                  const pct = totalAll ? (ch.total / totalAll) * 100 : 0;
                  return (
                    <li key={ch.channel}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: channelColor(ch.channel) }}
                          />
                          {channelLabel(ch.channel)}
                          <span className="text-xs text-[var(--color-text-muted)]">
                            ({ch.count})
                          </span>
                        </span>
                        <span className="font-medium">{formatRupiah(ch.total)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-elevated)]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: channelColor(ch.channel) }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {/* Category breakdowns */}
          {saleCats.length > 0 && (
            <Card>
              <h2 className="mb-3 font-heading text-base font-bold">
                Penjualan per Kategori
              </h2>
              <CategoryDonut data={saleCats} />
            </Card>
          )}
          {buyCats.length > 0 && (
            <Card>
              <h2 className="mb-3 font-heading text-base font-bold">
                Pembelian per Kategori
              </h2>
              <CategoryDonut data={buyCats} />
            </Card>
          )}
        </>
      )}
    </div>
    </PageTransition>
  );
}
