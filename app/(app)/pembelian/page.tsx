"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  TransactionFilters,
  type PeriodKey,
  type SortKey,
} from "@/components/TransactionFilters";
import { TransactionListItem } from "@/components/TransactionListItem";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { getPurchases, deletePurchase } from "@/lib/db/queries/purchases";
import { getCategoryBreakdown } from "@/lib/db/queries/reports";
import { useTxDrawer } from "@/lib/stores/useTxDrawer";
import { useAppStore } from "@/lib/stores/useAppStore";
import { useConfirm } from "@/lib/stores/useConfirm";
import { toast } from "@/lib/stores/useToastStore";
import { todayRange, thisWeekRange, thisMonthRange } from "@/lib/utils/ranges";
import { formatRupiah, formatDateTime } from "@/lib/utils/format";
import { animateIn } from "@/lib/animations/gsap";
import type { Purchase, CategoryBreakdown } from "@/lib/db/types";

export default function PembelianPage() {
  const openDrawer = useTxDrawer((s) => s.openDrawer);
  const dataVersion = useAppStore((s) => s.dataVersion);
  const bumpData = useAppStore((s) => s.bumpData);
  const confirm = useConfirm((s) => s.confirm);

  const [period, setPeriod] = useState<PeriodKey>("month");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const range =
      period === "today"
        ? todayRange()
        : period === "week"
        ? thisWeekRange()
        : period === "month"
        ? thisMonthRange()
        : null;

    Promise.all([
      getPurchases({
        from: range?.from,
        to: range?.to,
        search: search || undefined,
        sort,
      }),
      (async () => {
        const m = thisMonthRange();
        return getCategoryBreakdown("purchases", m.from, m.to);
      })(),
    ]).then(([rows, bd]) => {
      if (!active) return;
      setPurchases(rows);
      setBreakdown(bd);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [period, search, sort, dataVersion]);

  useEffect(() => {
    if (!loading && listRef.current) return animateIn(listRef.current, ".tx-row");
  }, [loading]);

  const total = useMemo(
    () => purchases.reduce((sum, p) => sum + p.total_amount, 0),
    [purchases]
  );

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: "Hapus transaksi?",
      message: "Transaksi pembelian ini akan dihapus permanen.",
    });
    if (!ok) return;
    await deletePurchase(id);
    bumpData();
    toast.success("Transaksi dihapus");
  };

  return (
    <PageTransition>
    <div>
      <PageHeader
        title="Pembelian"
        subtitle="Catatan pengeluaran operasional"
        action={
          <Button onClick={() => openDrawer("pembelian")} className="hidden sm:inline-flex">
            <Plus size={18} /> Tambah
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-text-secondary)]">
            Total {purchases.length} transaksi
          </span>
          <span className="text-lg font-bold text-[var(--color-danger)]">
            {formatRupiah(total)}
          </span>
        </div>
      </Card>

      {breakdown.length > 0 && (
        <Card className="mb-4">
          <h2 className="mb-3 font-heading text-base font-bold">
            Pengeluaran per Kategori (Bulan Ini)
          </h2>
          <CategoryDonut data={breakdown} />
        </Card>
      )}

      <TransactionFilters
        period={period}
        onPeriod={setPeriod}
        search={search}
        onSearch={setSearch}
        sort={sort}
        onSort={setSort}
      />

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex flex-col gap-3 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : purchases.length === 0 ? (
          <EmptyState
            icon={TrendingDown}
            title="Belum ada pembelian"
            description="Catat pengeluaran untuk memantau biaya operasional."
            action={
              <Button onClick={() => openDrawer("pembelian")}>
                <Plus size={18} /> Catat Pembelian
              </Button>
            }
          />
        ) : (
          <div ref={listRef} className="divide-y divide-[var(--color-border)] px-2">
            {purchases.map((p) => (
              <div key={p.id} className="tx-row">
                <TransactionListItem
                  id={p.id}
                  kind="pembelian"
                  name={p.item_name}
                  meta={`${formatDateTime(p.transaction_at)} · ${
                    p.quantity
                  } × ${formatRupiah(p.unit_price, false)}${
                    p.supplier ? ` · ${p.supplier}` : ""
                  }`}
                  amount={p.total_amount}
                  onEdit={() => openDrawer("pembelian", p.id)}
                  onDelete={() => handleDelete(p.id)}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
    </PageTransition>
  );
}
