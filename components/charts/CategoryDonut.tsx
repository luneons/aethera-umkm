"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { formatRupiah } from "@/lib/utils/format";
import type { CategoryBreakdown } from "@/lib/db/types";

export function CategoryDonut({
  data,
  height = 220,
}: {
  data: CategoryBreakdown[];
  height?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value, name) => [formatRupiah(Number(value)), String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-xs text-[var(--color-text-muted)]">Total</p>
            <p className="text-sm font-bold">{formatRupiah(total, false)}</p>
          </div>
        </div>
      </div>

      <ul className="flex w-full flex-1 flex-col gap-2">
        {data.map((d, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: d.color }}
              />
              <span className="text-[var(--color-text-secondary)]">{d.name}</span>
            </span>
            <span className="font-medium">{formatRupiah(d.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
