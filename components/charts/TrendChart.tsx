"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatRupiah } from "@/lib/utils/format";
import type { TrendPoint } from "@/lib/db/types";

function shortDay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(d);
}

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(n);
}

export function TrendChart({
  data,
  height = 220,
}: {
  data: TrendPoint[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="gSale" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4CAF50" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#4CAF50" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gBuy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F44336" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#F44336" stopOpacity={0} />
          </linearGradient>
        </defs>
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
          contentStyle={{
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            color: "var(--color-text-primary)",
            fontSize: 12,
          }}
          labelFormatter={(l) =>
            new Intl.DateTimeFormat("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "short",
            }).format(new Date(String(l) + "T00:00:00"))
          }
          formatter={(value, name) => [
            formatRupiah(Number(value)),
            name === "penjualan" ? "Penjualan" : "Pembelian",
          ]}
        />
        <Area
          type="monotone"
          dataKey="penjualan"
          stroke="#4CAF50"
          strokeWidth={2}
          fill="url(#gSale)"
        />
        <Area
          type="monotone"
          dataKey="pembelian"
          stroke="#F44336"
          strokeWidth={2}
          fill="url(#gBuy)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
