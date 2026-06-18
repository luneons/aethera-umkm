"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Package, Pencil, Trash2, Tag, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { ProductForm } from "@/components/forms/ProductForm";
import { CategoryManager } from "@/components/CategoryManager";
import { getProducts, deleteProduct } from "@/lib/db/queries/products";
import { useConfirm } from "@/lib/stores/useConfirm";
import { toast } from "@/lib/stores/useToastStore";
import { formatRupiah } from "@/lib/utils/format";
import { animateIn } from "@/lib/animations/gsap";
import { cn } from "@/lib/utils/cn";
import type { Product } from "@/lib/db/types";

export default function ProdukPage() {
  const confirm = useConfirm((s) => s.confirm);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    getProducts(true).then((rows) => {
      setProducts(rows);
      setLoading(false);
    });
  };

  useEffect(load, []);

  useEffect(() => {
    if (!loading && listRef.current) return animateIn(listRef.current, ".prod-row");
  }, [loading]);

  const handleDelete = async (p: Product) => {
    const ok = await confirm({
      title: "Hapus produk?",
      message: `"${p.name}" akan dihapus. Transaksi yang sudah tercatat tidak terpengaruh.`,
    });
    if (!ok) return;
    await deleteProduct(p.id);
    toast.success("Produk dihapus");
    load();
  };

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchActive = showInactive ? true : p.is_active === 1;
    return matchSearch && matchActive;
  });

  return (
    <PageTransition>
    <div>
      <PageHeader
        title="Produk"
        subtitle="Kelola daftar produk & kategori"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCatOpen(true)}>
              <Tag size={17} /> <span className="hidden sm:inline">Kategori</span>
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={18} /> <span className="hidden sm:inline">Tambah</span>
            </Button>
          </div>
        }
      />

      {/* Search & filter */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="pl-9"
          />
        </div>
        <button
          onClick={() => setShowInactive((v) => !v)}
          className={cn(
            "shrink-0 rounded-xl border px-3 text-sm font-medium transition-colors",
            showInactive
              ? "border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)]"
              : "border-[var(--color-border)] text-[var(--color-text-muted)]"
          )}
        >
          Nonaktif
        </button>
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex flex-col gap-3 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={search ? "Produk tidak ditemukan" : "Belum ada produk"}
            description={search ? "Coba kata kunci lain atau hapus filter." : "Tambahkan produk agar input transaksi lebih cepat dengan autocomplete."}
            action={
              !search ? (
                <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
                  <Plus size={18} /> Tambah Produk
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div ref={listRef} className="divide-y divide-[var(--color-border)]">
            {filtered.map((p) => (
              <div key={p.id} className="prod-row flex items-center gap-3 px-4 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-accent-gold)]">
                  <Package size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm font-medium", p.is_active === 0 && "text-[var(--color-text-muted)] line-through")}>
                    {p.name}
                  </p>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">
                    Jual {formatRupiah(p.sell_price)} · Beli {formatRupiah(p.buy_price)} / {p.unit}
                    {p.track_stock === 1 && ` · Stok: ${p.stock}`}
                    {p.is_active === 0 && " · Nonaktif"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    onClick={() => { setEditing(p); setFormOpen(true); }}
                    aria-label="Edit"
                    className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-info)]"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    aria-label="Hapus"
                    className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Summary counts */}
      {!loading && products.length > 0 && (
        <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">
          {products.filter((p) => p.is_active === 1).length} aktif · {products.filter((p) => p.is_active === 0).length} nonaktif
        </p>
      )}

      <ProductForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editing}
        onSaved={load}
      />
      <CategoryManager open={catOpen} onClose={() => setCatOpen(false)} />
    </div>
    </PageTransition>
  );
}
