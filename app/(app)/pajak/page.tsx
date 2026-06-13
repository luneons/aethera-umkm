"use client";

import { useEffect, useState } from "react";
import { FileText, Info } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { PremiumGate } from "@/components/PremiumGate";
import { usePremium } from "@/lib/stores/usePremium";
import { getMonthlyTax, getYearlyGross, UMKM_TAX_RATE, ANNUAL_EXEMPTION, type MonthlyTax } from "@/lib/utils/tax";
import { formatRupiah } from "@/lib/utils/format";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export default function PajakPage() {
  const active = usePremium((s) => s.active);
  const checked = usePremium((s) => s.checked);
  const dataVersion = usePremium((s) => s.checked); // re-eval when checked
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<MonthlyTax[]>([]);
  const [gross, setGross] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!active) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([getMonthlyTax(year), getYearlyGross(year)]).then(([r, g]) => {
      setRows(r);
      setGross(g);
      setLoading(false);
    });
  }, [year, active, dataVersion]);

  const totalTax = rows.reduce((s, r) => s + r.tax, 0);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        <PageHeader title="Laporan Pajak" subtitle="PPh Final UMKM 0,5%" />

        {!checked ? null : !active ? (
          <PremiumGate feature="tax_report">{null}</PremiumGate>
        ) : (
          <>
            <Card className="bg-[var(--color-info)]/5">
              <div className="flex items-start gap-3">
                <Info size={18} className="mt-0.5 shrink-0 text-[var(--color-info)]" />
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Berdasarkan PP 55/2022: tarif PPh Final 0,5% dari omset bruto. Omset
                  s/d {formatRupiah(ANNUAL_EXEMPTION)}/tahun pertama bebas pajak (untuk WP
                  Orang Pribadi). Angka ini estimasi — konsultasikan dengan konsultan pajak
                  untuk pelaporan resmi.
                </p>
              </div>
            </Card>

            <div className="flex items-center justify-between">
              <Select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-32"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    Tahun {y}
                  </option>
                ))}
              </Select>
            </div>

            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Card className="text-center">
                    <p className="text-xs text-[var(--color-text-secondary)]">Omset Setahun</p>
                    <p className="mt-1 text-sm font-bold text-[var(--color-success)]">
                      {formatRupiah(gross, false)}
                    </p>
                  </Card>
                  <Card className="text-center">
                    <p className="text-xs text-[var(--color-text-secondary)]">Tarif</p>
                    <p className="mt-1 text-sm font-bold">{(UMKM_TAX_RATE * 100).toFixed(1)}%</p>
                  </Card>
                  <Card className="text-center">
                    <p className="text-xs text-[var(--color-text-secondary)]">Pajak Terutang</p>
                    <p className="mt-1 text-sm font-bold text-[var(--color-danger)]">
                      {formatRupiah(totalTax, false)}
                    </p>
                  </Card>
                </div>

                <Card className="overflow-hidden p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                        <th className="px-4 py-2 font-medium">Bulan</th>
                        <th className="px-4 py-2 text-right font-medium">Omset</th>
                        <th className="px-4 py-2 text-right font-medium">Kena Pajak</th>
                        <th className="px-4 py-2 text-right font-medium">Pajak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.month} className="border-b border-[var(--color-border)] last:border-0">
                          <td className="px-4 py-2">{MONTHS[i]}</td>
                          <td className="px-4 py-2 text-right">{formatRupiah(r.gross, false)}</td>
                          <td className="px-4 py-2 text-right text-[var(--color-text-muted)]">
                            {formatRupiah(r.taxable, false)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-[var(--color-danger)]">
                            {formatRupiah(r.tax, false)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
