"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, TrendingUp } from "lucide-react";
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
import { getSales, deleteSale } from "@/lib/db/queries/sales";
import { getBusinessProfile } from "@/lib/db/queries/settings";
import { generateReceiptPDF } from "@/lib/utils/export";
import { useTxDrawer } from "@/lib/stores/useTxDrawer";
import { useAppStore } from "@/lib/stores/useAppStore";
import { useConfirm } from "@/lib/stores/useConfirm";
import { toast } from "@/lib/stores/useToastStore";
import { todayRange, thisWeekRange, thisMonthRange } from "@/lib/utils/ranges";
import { formatRupiah, formatDateTime, fromSqlDateTime } from "@/lib/utils/format";
import { animateIn } from "@/lib/animations/gsap";
import type { Sale } from "@/lib/db/types";

export default function PenjualanPage() {
  const openDrawer = useTxDrawer((s) => s.openDrawer);
  const dataVersion = useAppStore((s) => s.dataVersion);
  const bumpData = useAppStore((s) => s.bumpData);
  const confirm = useConfirm((s) => s.confirm);

  const [period, setPeriod] = useState<PeriodKey>("month");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [sales, setSales] = useState<Sale[]>([]);
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

    getSales({
      from: range?.from,
      to: range?.to,
      search: search || undefined,
      sort,
    }).then((rows) => {
      if (!active) return;
      setSales(rows);
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
    () => sales.reduce((sum, s) => sum + s.total_amount, 0),
    [sales]
  );

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: "Hapus transaksi?",
      message: "Transaksi penjualan ini akan dihapus permanen.",
    });
    if (!ok) return;
    await deleteSale(id);
    bumpData();
    toast.success("Transaksi dihapus");
  };

  const handlePrint = async (s: Sale) => {
    const prof = await getBusinessProfile();
    generateReceiptPDF(
      {
        businessName: prof?.name ?? "Usaha Saya",
        owner: prof?.owner,
        logoBase64: (prof as { logo_base64?: string | null })?.logo_base64,
        date: fromSqlDateTime(s.transaction_at),
        customerName: s.customer_name ?? undefined,
        invoiceNumber: s.invoice_number ?? undefined,
        note: s.notes ?? undefined,
      },
      [{ name: s.product_name, qty: s.quantity, unitPrice: s.unit_price, discount: s.discount_amount }]
    );
    toast.success("Struk dibuat");
  };

  return (
    <PageTransition>
    <div>
      <PageHeader
        title="Penjualan"
        subtitle="Catatan pemasukan dari penjualan"
        action={
          <Button onClick={() => openDrawer("penjualan")} className="hidden sm:inline-flex">
            <Plus size={18} /> Tambah
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-text-secondary)]">
            Total {sales.length} transaksi
          </span>
          <span className="text-lg font-bold text-[var(--color-success)]">
            {formatRupiah(total)}
          </span>
        </div>
      </Card>

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
        ) : sales.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Belum ada penjualan"
            description="Mulai catat penjualan untuk melihat ringkasan omsetmu."
            action={
              <Button onClick={() => openDrawer("penjualan")}>
                <Plus size={18} /> Catat Penjualan
              </Button>
            }
          />
        ) : (
          <div ref={listRef} className="divide-y divide-[var(--color-border)] px-2">
            {sales.map((s) => (
              <div key={s.id} className="tx-row">
                <TransactionListItem
                  id={s.id}
                  kind="penjualan"
                  name={s.product_name}
                  meta={`${formatDateTime(s.transaction_at)} · ${
                    s.quantity
                  } × ${formatRupiah(s.unit_price, false)}${
                    s.category_name ? ` · ${s.category_name}` : ""
                  }`}
                  amount={s.total_amount}
                  onEdit={() => openDrawer("penjualan", s.id)}
                  onDelete={() => handleDelete(s.id)}
                  onPrint={() => handlePrint(s)}
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
