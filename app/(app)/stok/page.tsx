"use client";

import { useEffect, useRef, useState } from "react";
import { Boxes, AlertTriangle, Plus, Minus, PackageSearch } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { getProducts, adjustStock } from "@/lib/db/queries/products";
import { useAppStore } from "@/lib/stores/useAppStore";
import { toast } from "@/lib/stores/useToastStore";
import { animateIn } from "@/lib/animations/gsap";
import { cn } from "@/lib/utils/cn";
import type { Product } from "@/lib/db/types";

export default function StokPage() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const bumpData = useAppStore((s) => s.bumpData);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
    await adjustStock(p.id, delta);
    bumpData();
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const lowStock = products.filter((p) => p.stock <= p.low_stock_threshold);

  return (
    <PageTransition>
      <div>
        <PageHeader title="Stok" subtitle="Pantau persediaan barang" />

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
                    <span
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                        low
                          ? "bg-[var(--color-warning)]/15 text-[var(--color-warning)]"
                          : "bg-[var(--color-bg-elevated)] text-[var(--color-accent-gold)]"
                      )}
                    >
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
                    <div className="flex shrink-0 items-center gap-1">
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  );
}
