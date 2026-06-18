"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ComparisonBarChart } from "@/components/charts/ComparisonBarChart";
import { getMonthlyCashFlow, getYearOverYear } from "@/lib/db/queries/reports";
import { formatRupiah } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

type ViewMode = "cashflow" | "yoy";

export default function ArusKasPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [mode, setMode] = useState<ViewMode>("cashflow");
  const [loading, setLoading] = useState(true);
  const [cashflow, setCashflow] = useState<{ month: number; penjualan: number; pembelian: number; laba: number }[]>([]);
  const [yoy, setYoy] = useState<{ month: number; thisYear: number; lastYear: number }[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getMonthlyCashFlow(year), getYearOverYear(year)]).then(([cf, yy]) => {
      setCashflow(cf);
      setYoy(yy);
      setLoading(false);
    });
  }, [year]);

  const totalPenjualan = cashflow.reduce((s, m) => s + m.penjualan, 0);
  const totalPembelian = cashflow.reduce((s, m) => s + m.pembelian, 0);
  const totalLaba = totalPenjualan - totalPembelian;

  // Map data to ComparisonBarChart format
  const chartData = mode === "cashflow"
    ? cashflow.map((m) => ({ tanggal: MONTH_NAMES[m.month - 1], penjualan: m.penjualan, pembelian: m.pembelian }))
    : yoy.map((m) => ({ tanggal: MONTH_NAMES[m.month - 1], penjualan: m.thisYear, pembelian: m.lastYear }));

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        <PageHeader title="Arus Kas" subtitle="Ringkasan keuangan tahunan" />

        {/* Year selector */}
        <div className="flex items-center gap-3">
          <button onClick={() => setYear((y) => y - 1)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]">
            ‹
          </button>
          <span className="flex-1 text-center text-lg font-bold">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= currentYear}
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] disabled:opacity-30">
            ›
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1">
          {(["cashflow", "yoy"] as ViewMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={cn(
                "flex-1 rounded-xl py-2 text-sm font-medium transition-colors",
                mode === m
                  ? "bg-[var(--color-accent-gold)] text-black"
                  : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
              )}>
              {m === "cashflow" ? "Arus Kas" : "Year-over-Year"}
            </button>
          ))}
        </div>

        {loading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </>
        ) : (
          <>
            {/* Annual summary */}
            {mode === "cashflow" && (
              <div className="grid grid-cols-3 gap-3">
                <Card className="text-center">
                  <TrendingUp size={16} className="mx-auto mb-1 text-[var(--color-success)]" />
                  <p className="text-xs text-[var(--color-text-secondary)]">Pemasukan</p>
                  <p className="mt-1 text-sm font-bold text-[var(--color-success)]">{formatRupiah(totalPenjualan, false)}</p>
                </Card>
                <Card className="text-center">
                  <TrendingDown size={16} className="mx-auto mb-1 text-[var(--color-danger)]" />
                  <p className="text-xs text-[var(--color-text-secondary)]">Pengeluaran</p>
                  <p className="mt-1 text-sm font-bold text-[var(--color-danger)]">{formatRupiah(totalPembelian, false)}</p>
                </Card>
                <Card className="text-center">
                  <Wallet size={16} className="mx-auto mb-1 text-[var(--color-accent-gold)]" />
                  <p className="text-xs text-[var(--color-text-secondary)]">Laba</p>
                  <p className="mt-1 text-sm font-bold" style={{ color: totalLaba >= 0 ? "var(--color-accent-gold)" : "var(--color-danger)" }}>
                    {formatRupiah(totalLaba, false)}
                  </p>
                </Card>
              </div>
            )}

            {/* Chart */}
            <Card>
              <h2 className="mb-2 font-heading text-base font-bold">
                {mode === "cashflow" ? `Arus Kas Bulanan ${year}` : `Perbandingan ${year - 1} vs ${year}`}
              </h2>
              {chartData.some((d) => d.penjualan || d.pembelian) ? (
                <ComparisonBarChart
                  data={chartData}
                  height={280}
                  legend={mode === "yoy" ? [{ key: "penjualan", label: String(year) }, { key: "pembelian", label: String(year - 1) }] : undefined}
                />
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-[var(--color-text-muted)]">
                  <BarChart3 size={32} className="mr-2 opacity-30" /> Belum ada data transaksi di tahun ini
                </div>
              )}
            </Card>

            {/* Monthly detail table */}
            {mode === "cashflow" && (
              <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                        <th className="px-4 py-2 text-left font-semibold text-[var(--color-text-secondary)]">Bulan</th>
                        <th className="px-4 py-2 text-right font-semibold text-[var(--color-success)]">Penjualan</th>
                        <th className="px-4 py-2 text-right font-semibold text-[var(--color-danger)]">Pembelian</th>
                        <th className="px-4 py-2 text-right font-semibold text-[var(--color-accent-gold)]">Laba</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {cashflow.map((m) => (
                        <tr key={m.month} className={m.month === new Date().getMonth() + 1 && year === currentYear ? "bg-[var(--color-bg-elevated)]" : ""}>
                          <td className="px-4 py-2 font-medium">{MONTH_NAMES[m.month - 1]}</td>
                          <td className="px-4 py-2 text-right text-[var(--color-success)]">{m.penjualan ? formatRupiah(m.penjualan, false) : "-"}</td>
                          <td className="px-4 py-2 text-right text-[var(--color-danger)]">{m.pembelian ? formatRupiah(m.pembelian, false) : "-"}</td>
                          <td className="px-4 py-2 text-right font-semibold" style={{ color: m.laba >= 0 ? "var(--color-accent-gold)" : "var(--color-danger)" }}>
                            {m.penjualan || m.pembelian ? formatRupiah(m.laba, false) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[var(--color-border)] bg-[var(--color-bg-elevated)] font-bold">
                        <td className="px-4 py-2">Total</td>
                        <td className="px-4 py-2 text-right text-[var(--color-success)]">{formatRupiah(totalPenjualan, false)}</td>
                        <td className="px-4 py-2 text-right text-[var(--color-danger)]">{formatRupiah(totalPembelian, false)}</td>
                        <td className="px-4 py-2 text-right" style={{ color: totalLaba >= 0 ? "var(--color-accent-gold)" : "var(--color-danger)" }}>
                          {formatRupiah(totalLaba, false)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
