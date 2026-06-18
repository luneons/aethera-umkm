"use client";

import { useEffect, useRef, useState } from "react";
import { Boxes, AlertTriangle, Plus, Minus, PackageSearch, ClipboardList, History, Check, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { Drawer } from "@/components/ui/Drawer";
import { getProducts, adjustStock, setStock } from "@/lib/db/queries/products";
import { getStockMovements } from "@/lib/db/queries/stockMovements";
import { useAppStore } from "@/lib/stores/useAppStore";
import { toast } from "@/lib/stores/useToastStore";
import { animateIn } from "@/lib/animations/gsap";
import { formatDateTime, formatRupiah } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Product, StockMovement } from "@/lib/db/types";

const REASON_LABEL: Record<string, string> = {
  penjualan: "Penjualan",
  pembelian: "Pembelian/Restock",
  opname: "Stock Opname",
  adjustment: "Penyesuaian",
  retur: "Retur",
};

function StockHistoryDrawer({ product, open, onClose }: { product: Product | null; open: boolean; onClose: () => void }) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !product) return;
    setLoading(true);
    getStockMovements(product.id, 30).then((m) => {
      setMovements(m);
      setLoading(false);
    });
  }, [open, product]);

  return (
    <Drawer open={open} onClose={onClose} title={`Riwayat Stok — ${product?.name ?? ""}`}>
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : movements.length === 0 ? (
        <EmptyState icon={History} title="Belum ada riwayat" description="Mutasi stok akan muncul di sini setelah ada transaksi." />
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--color-border)]">
          {movements.map((m) => {
            const isIn = m.delta > 0;
            return (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <span className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold",
                  isIn ? "bg-[var(--color-success)]/15 text-[var(--color-success)]" : "bg-[var(--color-danger)]/15 text-[var(--color-danger)]"
                )}>
                  {isIn ? "+" : ""}
                  {m.delta}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{REASON_LABEL[m.reason] ?? m.reason}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Sisa: {m.stock_after} · {formatDateTime(m.created_at)}
                  </p>
                  {m.notes && <p className="truncate text-xs text-[var(--color-text-muted)]">{m.notes}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}

function OpnameDrawer({ product, open, onClose, onDone }: { product: Product | null; open: boolean; onClose: () => void; onDone: () => void }) {
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && product) {
      setValue(String(product.stock));
      setNotes("");
    }
  }, [open, product]);

  const handleSave = async () => {
    if (!product) return;
    const newStock = parseFloat(value);
    if (isNaN(newStock) || newStock < 0) {
      toast.error("Jumlah stok tidak valid");
      return;
    }
    setSaving(true);
    try {
      await setStock(product.id, newStock, notes || "Stock opname");
      toast.success(`Stok ${product.name} diperbarui ke ${newStock}`);
      onDone();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Stock Opname — ${product?.name ?? ""}`}
      footer={
        <Button fullWidth loading={saving} onClick={handleSave}>
          <Check size={16} /> Simpan Stok Aktual
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Masukkan jumlah stok aktual hasil penghitungan fisik. Sistem akan mencatat selisih sebagai mutasi opname.
        </p>
        {product && (
          <div className="rounded-xl bg-[var(--color-bg-elevated)] px-4 py-3 text-sm">
            <span className="text-[var(--color-text-muted)]">Stok sistem saat ini: </span>
            <span className="font-bold">{product.stock} {product.unit}</span>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">Stok Aktual <span className="text-[var(--color-danger)]">*</span></label>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">Catatan Opname</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" />
        </div>
      </div>
    </Drawer>
  );
}

export default function StokPage() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const bumpData = useAppStore((s) => s.bumpData);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [opnameProduct, setOpnameProduct] = useState<Product | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    getProducts(false).then((rows) => {
      setProducts(rows.filter((p) => p.track_stock === 1));
      setLoading(false);
    });
  };

  useEffect(load, [dataVersion]);

  useEffect(() => {
    if (!loading && listRef.current) return animateIn(listRef.current, ".stock-row");
  }, [loading]);

  const handleAdjust = async (p: Product, delta: number) => {
    if (p.stock + delta < 0) {
      toast.error("Stok tidak boleh negatif");
      return;
    }
    await adjustStock(p.id, delta, "adjustment");
    bumpData();
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const lowStock = products.filter((p) => p.stock <= p.low_stock_threshold);

  return (
    <PageTransition>
      <div>
        <PageHeader title="Stok" subtitle="Pantau & kelola persediaan barang" />

        {lowStock.length > 0 && (
          <Card className="mb-4 border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--color-warning)]/15 text-[var(--color-warning)]">
                <AlertTriangle size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-[var(--color-warning)]">
                  {lowStock.length} produk stoknya menipis
                </h2>
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                  {lowStock.map((p) => `${p.name} (${p.stock})`).join(", ")}
                </p>
              </div>
            </div>
          </Card>
        )}

        {!loading && products.length > 0 && (
          <div className="mb-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
            />
          </div>
        )}

        <Card className="overflow-hidden p-0">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="Belum ada produk dengan lacak stok"
              description="Aktifkan 'Lacak Stok' saat menambah atau mengedit produk untuk memantau persediaan di sini."
            />
          ) : (
            <div ref={listRef} className="divide-y divide-[var(--color-border)]">
              {filtered.map((p) => {
                const low = p.stock <= p.low_stock_threshold;
                return (
                  <div key={p.id} className="stock-row flex items-center gap-3 px-4 py-3">
                    <span className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                      low
                        ? "bg-[var(--color-warning)]/15 text-[var(--color-warning)]"
                        : "bg-[var(--color-bg-elevated)] text-[var(--color-accent-gold)]"
                    )}>
                      <Boxes size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Stok:{" "}
                        <span className={low ? "font-bold text-[var(--color-warning)]" : ""}>
                          {p.stock} {p.unit}
                        </span>
                        {p.low_stock_threshold > 0 && ` · min ${p.low_stock_threshold}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        onClick={() => handleAdjust(p, -1)}
                        aria-label="Kurangi"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--color-border)] text-[var(--color-danger)] hover:bg-[var(--color-bg-elevated)]"
                      >
                        <Minus size={15} />
                      </button>
                      <span className="w-9 text-center text-sm font-semibold">{p.stock}</span>
                      <button
                        onClick={() => handleAdjust(p, 1)}
                        aria-label="Tambah"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--color-border)] text-[var(--color-success)] hover:bg-[var(--color-bg-elevated)]"
                      >
                        <Plus size={15} />
                      </button>
                      <button
                        onClick={() => setOpnameProduct(p)}
                        aria-label="Stock opname"
                        title="Stock Opname (set stok aktual)"
                        className="ml-1 grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-accent-gold)]"
                      >
                        <ClipboardList size={15} />
                      </button>
                      <button
                        onClick={() => setHistoryProduct(p)}
                        aria-label="Riwayat stok"
                        title="Lihat riwayat mutasi stok"
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-info)]"
                      >
                        <History size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <StockHistoryDrawer
        product={historyProduct}
        open={!!historyProduct}
        onClose={() => setHistoryProduct(null)}
      />
      <OpnameDrawer
        product={opnameProduct}
        open={!!opnameProduct}
        onClose={() => setOpnameProduct(null)}
        onDone={load}
      />
    </PageTransition>
  );
}
