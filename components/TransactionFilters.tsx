"use client";

import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";

export type PeriodKey = "today" | "week" | "month" | "all";
export type SortKey = "newest" | "oldest" | "amount_desc" | "amount_asc";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hari ini" },
  { key: "week", label: "Minggu ini" },
  { key: "month", label: "Bulan ini" },
  { key: "all", label: "Semua" },
];

interface Props {
  period: PeriodKey;
  onPeriod: (p: PeriodKey) => void;
  search: string;
  onSearch: (s: string) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
}

export function TransactionFilters({
  period,
  onPeriod,
  search,
  onSearch,
  sort,
  onSort,
}: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPeriod(p.key)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              period === p.key
                ? "bg-[var(--color-accent-gold)] text-black"
                : "bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Cari transaksi..."
            className="pl-9"
          />
        </div>
        <Select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          className="w-auto min-w-[130px]"
        >
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="amount_desc">Nominal ↓</option>
          <option value="amount_asc">Nominal ↑</option>
        </Select>
      </div>
    </div>
  );
}

export { PERIODS };
