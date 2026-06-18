"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatRupiah } from "@/lib/utils/format";
import type { TrendPoint } from "@/lib/db/types";

function shortDay(dateStr: string) {
  // Handle both "YYYY-MM-DD" and month-abbreviation strings like "Jan"
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(d);
  }
  return dateStr;
}
function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(n);
}

interface LegendOverride {
  key: string;
  label: string;
}

export function ComparisonBarChart({
  data,
  height = 260,
  legend,
}: {
  data: TrendPoint[];
  height?: number;
  legend?: LegendOverride[];
}) {
  const labelFor = (key: string): string => {
    if (legend) {
      const found = legend.find((l) => l.key === key);
      if (found) return found.label;
    }
    return key === "penjualan" ? "Penjualan" : "Pembelian";
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="tanggal"
          tickFormatter={shortDay}
          tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={compact}
          tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          cursor={{ fill: "var(--color-bg-elevated)", opacity: 0.4 }}
          contentStyle={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(value, name) => [formatRupiah(Number(value)), labelFor(String(name))]}
        />
        <Legend formatter={(v) => labelFor(v)} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="penjualan" fill="#4CAF50" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="pembelian" fill="#F44336" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
