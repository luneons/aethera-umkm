"use client";

import { useEffect, useState } from "react";
import { Repeat, Plus, Pencil, Trash2, Play, Pause, Zap } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { RecurringForm } from "@/components/forms/RecurringForm";
import {
  getRecurring,
  deleteRecurring,
  setRecurringActive,
  advanceRecurring,
} from "@/lib/db/queries/recurring";
import { createSale } from "@/lib/db/queries/sales";
import { createPurchase } from "@/lib/db/queries/purchases";
import { useConfirm } from "@/lib/stores/useConfirm";
import { useAppStore } from "@/lib/stores/useAppStore";
import { toast } from "@/lib/stores/useToastStore";
import { formatRupiah, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Recurring } from "@/lib/db/types";

const FREQ_LABEL: Record<string, string> = {
  harian: "Setiap hari",
  mingguan: "Setiap minggu",
  bulanan: "Setiap bulan",
};

export default function BerulangPage() {
  const confirm = useConfirm((s) => s.confirm);
  const bumpData = useAppStore((s) => s.bumpData);
  const [items, setItems] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Recurring | null>(null);

  const load = () => {
    setLoading(true);
    getRecurring().then((rows) => {
      setItems(rows);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const handleDelete = async (item: Recurring) => {
    const ok = await confirm({
      title: "Hapus template?",
      message: `Template "${item.name}" akan dihapus.`,
    });
    if (!ok) return;
    await deleteRecurring(item.id);
    toast.success("Template dihapus");
    load();
  };

  const handleToggle = async (item: Recurring) => {
    await setRecurringActive(item.id, item.is_active !== 1);
    load();
  };

  const handleRunNow = async (item: Recurring) => {
    const data = {
      productId: null,
      categoryId: item.category_id,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalAmount: item.quantity * item.unit_price,
      paymentMethod: item.payment_method,
      channel: item.channel,
      notes: item.notes,
      transactionAt: new Date(),
    };
    if (item.kind === "penjualan") {
      await createSale({ ...data, productName: item.name });
    } else {
      await createPurchase({ ...data, itemName: item.name });
    }
    await advanceRecurring(item.id, item.frequency, new Date());
    bumpData();
    toast.success(`Transaksi "${item.name}" dicatat`);
    load();
  };

  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Transaksi Berulang"
          subtitle="Otomatiskan transaksi rutin"
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={18} /> <span className="hidden sm:inline">Tambah</span>
            </Button>
          }
        />

        <Card className="overflow-hidden p-0">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Repeat}
              title="Belum ada transaksi berulang"
              description="Buat template untuk transaksi rutin seperti sewa, gaji, atau langganan. Bisa dijalankan sekali klik."
              action={
                <Button
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus size={18} /> Buat Template
                </Button>
              }
            />
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {items.map((item) => {
                const isSale = item.kind === "penjualan";
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                        item.is_active === 1
                          ? "bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)]"
                          : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
                      )}
                    >
                      <Repeat size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="truncate text-xs text-[var(--color-text-muted)]">
                        {FREQ_LABEL[item.frequency]} ·{" "}
                        <span
                          style={{
                            color: isSale
                              ? "var(--color-success)"
                              : "var(--color-danger)",
                          }}
                        >
                          {formatRupiah(item.quantity * item.unit_price)}
                        </span>{" "}
                        · {formatDate(item.next_run)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        onClick={() => handleRunNow(item)}
                        aria-label="Jalankan sekarang"
                        title="Catat sekarang"
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-success)] hover:bg-[var(--color-bg-elevated)]"
                      >
                        <Zap size={15} />
                      </button>
                      <button
                        onClick={() => handleToggle(item)}
                        aria-label="Aktif/nonaktif"
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]"
                      >
                        {item.is_active === 1 ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                      <button
                        onClick={() => {
                          setEditing(item);
                          setFormOpen(true);
                        }}
                        aria-label="Edit"
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-info)]"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        aria-label="Hapus"
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-danger)]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <RecurringForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        item={editing}
        onSaved={load}
      />
    </PageTransition>
  );
}
