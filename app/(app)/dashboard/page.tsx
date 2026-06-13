"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Share2,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { TrendChart } from "@/components/charts/TrendChart";
import { TargetProgress } from "@/components/TargetProgress";
import { useAppStore } from "@/lib/stores/useAppStore";
import { useTxDrawer } from "@/lib/stores/useTxDrawer";
import { animateDashboard, animateChartOnScroll } from "@/lib/animations/gsap";
import {
  formatRupiah,
  formatTime,
  getGreeting,
  percentDelta,
} from "@/lib/utils/format";
import { todayRange, yesterdayRange, lastNDaysRange, thisMonthRange } from "@/lib/utils/ranges";
import { getSummary, getTrend, getRecentTransactions, getTopProducts } from "@/lib/db/queries/reports";
import { getTarget } from "@/lib/db/queries/targets";
import { getLowStockProducts } from "@/lib/db/queries/products";
import { getBusinessProfile } from "@/lib/db/queries/settings";
import { shareToWhatsApp, buildDailySummaryMessage } from "@/lib/utils/whatsapp";
import { toast } from "@/lib/stores/useToastStore";
import type { DailySummary, RecentTransaction, TrendPoint, Target, Product } from "@/lib/db/types";

export default function DashboardPage() {
  const profile = useAppStore((s) => s.profile);
  const dataVersion = useAppStore((s) => s.dataVersion);
  const openDrawer = useTxDrawer((s) => s.openDrawer);

  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<DailySummary | null>(null);
  const [yesterday, setYesterday] = useState<DailySummary | null>(null);
  const [monthSummary, setMonthSummary] = useState<DailySummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [recent, setRecent] = useState<RecentTransaction[]>([]);
  const [dailyTarget, setDailyTarget] = useState<Target | null>(null);
  const [monthlyTarget, setMonthlyTarget] = useState<Target | null>(null);
  const [lowStock, setLowStock] = useState<Product[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const t = todayRange();
      const y = yesterdayRange();
      const week = lastNDaysRange(7);
      const month = thisMonthRange();
      const [ts, ys, ms, tr, rc, dt, mt, ls] = await Promise.all([
        getSummary(t.from, t.to),
        getSummary(y.from, y.to),
        getSummary(month.from, month.to),
        getTrend(week.fromDate, week.toDate),
        getRecentTransactions(5),
        getTarget("harian"),
        getTarget("bulanan"),
        getLowStockProducts(),
      ]);
      if (!active) return;
      setToday(ts);
      setYesterday(ys);
      setMonthSummary(ms);
      setTrend(tr);
      setRecent(rc);
      setDailyTarget(dt);
      setMonthlyTarget(mt);
      setLowStock(ls);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [dataVersion]);

  const handleShare = async () => {
    const t = todayRange();
    const [summary, top, prof] = await Promise.all([
      getSummary(t.from, t.to),
      getTopProducts(t.from, t.to, 3),
      getBusinessProfile(),
    ]);
    if (summary.total_penjualan === 0 && summary.total_pembelian === 0) {
      toast.error("Belum ada transaksi hari ini untuk dibagikan");
      return;
    }
    const msg = buildDailySummaryMessage(prof?.name ?? "Usaha Saya", summary, top);
    shareToWhatsApp(msg);
  };

  useEffect(() => {
    if (!loading && containerRef.current) {
      return animateDashboard(containerRef.current);
    }
  }, [loading]);

  useEffect(() => {
    if (!loading && chartRef.current) {
      return animateChartOnScroll(chartRef.current);
    }
  }, [loading]);

  const salesDelta = percentDelta(
    today?.total_penjualan ?? 0,
    yesterday?.total_penjualan ?? 0
  );
  const purchaseDelta = percentDelta(
    today?.total_pembelian ?? 0,
    yesterday?.total_pembelian ?? 0
  );
  const labaPercent =
    today && today.total_penjualan > 0
      ? Math.max(0, Math.min(100, (today.laba / today.total_penjualan) * 100))
      : 0;

  return (
    <div ref={containerRef} className="flex flex-col gap-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {getGreeting()},
          </p>
          <h1 className="font-heading text-2xl font-extrabold">
            {profile?.owner || profile?.name || "Pengguna"} 👋
          </h1>
        </div>
        <button
          onClick={handleShare}
          aria-label="Bagikan ke WhatsApp"
          title="Bagikan ringkasan ke WhatsApp"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] text-[var(--color-success)] hover:bg-[var(--color-bg-elevated)]"
        >
          <Share2 size={18} />
        </button>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-success)]/15 text-[var(--color-success)]">
                    <TrendingUp size={16} />
                  </span>
                  Penjualan Hari Ini
                </span>
              </div>
              <p
                className="mt-3 text-2xl font-bold"
                data-counter={today?.total_penjualan ?? 0}
              >
                {formatRupiah(today?.total_penjualan ?? 0)}
              </p>
              {salesDelta !== null && (
                <DeltaBadge value={salesDelta} positiveIsGood />
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-danger)]/15 text-[var(--color-danger)]">
                    <TrendingDown size={16} />
                  </span>
                  Pembelian Hari Ini
                </span>
              </div>
              <p
                className="mt-3 text-2xl font-bold"
                data-counter={today?.total_pembelian ?? 0}
              >
                {formatRupiah(today?.total_pembelian ?? 0)}
              </p>
              {purchaseDelta !== null && (
                <DeltaBadge value={purchaseDelta} positiveIsGood={false} />
              )}
            </Card>
          </div>

          {/* Laba */}
          <Card>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)]">
                  <Wallet size={16} />
                </span>
                Laba Bersih Estimasi
              </span>
              <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                {labaPercent.toFixed(1)}%
              </span>
            </div>
            <p
              className="mt-3 text-3xl font-extrabold"
              style={{
                color:
                  (today?.laba ?? 0) >= 0
                    ? "var(--color-accent-gold)"
                    : "var(--color-danger)",
              }}
            >
              {formatRupiah(today?.laba ?? 0)}
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-elevated)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent-gold)] transition-all"
                style={{ width: `${labaPercent}%` }}
              />
            </div>
          </Card>

          {/* Target progress */}
          {(dailyTarget || monthlyTarget) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {dailyTarget && (
                <TargetProgress
                  label="Target Harian"
                  current={today?.total_penjualan ?? 0}
                  target={dailyTarget.amount}
                />
              )}
              {monthlyTarget && (
                <TargetProgress
                  label="Target Bulanan"
                  current={monthSummary?.total_penjualan ?? 0}
                  target={monthlyTarget.amount}
                />
              )}
            </div>
          )}

          {/* Low stock alert */}
          {lowStock.length > 0 && (
            <Link href="/stok">
              <Card className="border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-warning)]/15 text-[var(--color-warning)]">
                    <AlertTriangle size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--color-warning)]">
                      {lowStock.length} produk stoknya menipis
                    </p>
                    <p className="truncate text-xs text-[var(--color-text-secondary)]">
                      {lowStock.map((p) => p.name).join(", ")}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="aethera-card"
              onClick={() => openDrawer("penjualan")}
            >
              <Plus size={18} /> Catat Penjualan
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="aethera-card"
              onClick={() => openDrawer("pembelian")}
            >
              <Plus size={18} /> Catat Pembelian
            </Button>
          </div>

          {/* Trend chart */}
          <Card ref={chartRef}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-heading text-base font-bold">Tren 7 Hari</h2>
              <Link
                href="/laporan"
                className="text-xs font-medium text-[var(--color-accent-gold)]"
              >
                Lihat laporan
              </Link>
            </div>
            <TrendChart data={trend} height={200} />
          </Card>

          {/* Recent */}
          <Card>
            <h2 className="mb-1 font-heading text-base font-bold">
              Transaksi Terbaru
            </h2>
            {recent.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Belum ada transaksi"
                description="Catat penjualan atau pembelian pertamamu untuk mulai melihat ringkasan."
              />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {recent.map((t) => {
                  const isSale = t.kind === "penjualan";
                  return (
                    <li
                      key={`${t.kind}-${t.id}`}
                      className="flex items-center gap-3 py-3"
                    >
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                        style={{
                          background: isSale
                            ? "rgba(76,175,80,0.15)"
                            : "rgba(244,67,54,0.15)",
                          color: isSale
                            ? "var(--color-success)"
                            : "var(--color-danger)",
                        }}
                      >
                        {isSale ? (
                          <ArrowUpRight size={16} />
                        ) : (
                          <ArrowDownRight size={16} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {formatTime(t.transaction_at)} ·{" "}
                          {isSale ? "Penjualan" : "Pembelian"}
                        </p>
                      </div>
                      <span
                        className="shrink-0 text-sm font-semibold"
                        style={{
                          color: isSale
                            ? "var(--color-success)"
                            : "var(--color-danger)",
                        }}
                      >
                        {isSale ? "+" : "-"}
                        {formatRupiah(t.total_amount, false)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function DeltaBadge({
  value,
  positiveIsGood,
}: {
  value: number;
  positiveIsGood: boolean;
}) {
  const up = value >= 0;
  const good = positiveIsGood ? up : !up;
  return (
    <span
      className="mt-2 inline-flex items-center gap-1 text-xs font-medium"
      style={{ color: good ? "var(--color-success)" : "var(--color-danger)" }}
    >
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {Math.abs(value).toFixed(0)}% vs kemarin
    </span>
  );
}
