"use client";

import { useEffect, useRef, useState } from "react";
import { ScanLine, Calculator } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { PriceCalculator } from "@/components/PriceCalculator";
import { formatThousands, parseRupiah } from "@/lib/utils/format";
import { shake } from "@/lib/animations/gsap";
import { productSchema } from "@/lib/validations/transaction";
import { createProduct, updateProduct, getProducts } from "@/lib/db/queries/products";
import { getCategories } from "@/lib/db/queries/categories";
import { evaluateAchievements } from "@/lib/achievements";
import { usePremium, FREE_PRODUCT_LIMIT } from "@/lib/stores/usePremium";
import { toast } from "@/lib/stores/useToastStore";
import type { Category, Product } from "@/lib/db/types";

const UNITS = ["pcs", "kg", "gram", "liter", "ml", "porsi", "pack", "box", "lusin"];

interface Props {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSaved: () => void;
}

export function ProductForm({ open, onClose, product, onSaved }: Props) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [sellPrice, setSellPrice] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [trackStock, setTrackStock] = useState(false);
  const [stock, setStock] = useState("0");
  const [lowStock, setLowStock] = useState("0");
  const [barcode, setBarcode] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const premiumActive = usePremium((s) => s.active);

  useEffect(() => {
    if (open) getCategories("penjualan").then(setCategories);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setName(product.name);
      setCategoryId(product.category_id);
      setSellPrice(formatThousands(String(Math.round(product.sell_price))));
      setBuyPrice(formatThousands(String(Math.round(product.buy_price))));
      setUnit(product.unit);
      setDescription(product.description ?? "");
      setIsActive(product.is_active === 1);
      setTrackStock(product.track_stock === 1);
      setStock(String(product.stock ?? 0));
      setLowStock(String(product.low_stock_threshold ?? 0));
      setBarcode(product.barcode ?? "");
    } else {
      setName("");
      setCategoryId(null);
      setSellPrice("");
      setBuyPrice("");
      setUnit("pcs");
      setDescription("");
      setIsActive(true);
      setTrackStock(false);
      setStock("0");
      setLowStock("0");
      setBarcode("");
    }
    setErrors({});
  }, [open, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      categoryId,
      sellPrice: parseRupiah(sellPrice),
      buyPrice: parseRupiah(buyPrice),
      unit,
      description: description || undefined,
      isActive,
      stock: parseFloat(stock) || 0,
      trackStock,
      lowStockThreshold: parseFloat(lowStock) || 0,
      barcode: barcode || undefined,
    };
    const result = productSchema.safeParse(payload);
    if (!result.success) {
      const fe: Record<string, string> = {};
      for (const issue of result.error.issues) fe[issue.path[0] as string] = issue.message;
      setErrors(fe);
      shake(formRef.current);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (product) {
        await updateProduct(product.id, payload);
      } else {
        // Free-tier product limit.
        if (!premiumActive) {
          const existing = await getProducts();
          if (existing.length >= FREE_PRODUCT_LIMIT) {
            toast.error(
              `Paket gratis maksimal ${FREE_PRODUCT_LIMIT} produk. Upgrade ke Premium untuk tanpa batas.`
            );
            setSaving(false);
            return;
          }
        }
        await createProduct(payload);
      }
      void evaluateAchievements();
      toast.success(product ? "Produk diperbarui" : "Produk ditambahkan");
      onSaved();
      onClose();
    } catch {
      toast.error("Gagal menyimpan produk");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={product ? "Edit Produk" : "Tambah Produk"}
      footer={
        <Button fullWidth size="lg" loading={saving} onClick={() => formRef.current?.requestSubmit()}>
          {product ? "Simpan Perubahan" : "Simpan Produk"}
        </Button>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nama Produk" required error={errors.name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} invalid={!!errors.name} autoFocus />
        </Field>

        <Field label="Kategori">
          <Select
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Tanpa kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Harga Jual" error={errors.sellPrice}>
            <Input
              inputMode="numeric"
              value={sellPrice}
              onChange={(e) => setSellPrice(formatThousands(e.target.value))}
              placeholder="0"
              invalid={!!errors.sellPrice}
            />
          </Field>
          <Field label="Harga Beli (HPP)" error={errors.buyPrice}>
            <Input
              inputMode="numeric"
              value={buyPrice}
              onChange={(e) => setBuyPrice(formatThousands(e.target.value))}
              placeholder="0"
              invalid={!!errors.buyPrice}
            />
          </Field>
        </div>

        <Button type="button" variant="ghost" size="sm" onClick={() => setCalcOpen(true)}>
          <Calculator size={16} /> Hitung harga jual ideal
        </Button>

        <Field label="Satuan" error={errors.unit}>
          <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Barcode / SKU">
          <div className="flex gap-1.5">
            <Input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Opsional"
            />
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              aria-label="Scan barcode"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] text-[var(--color-accent-gold)] hover:bg-[var(--color-bg-elevated)]"
            >
              <ScanLine size={18} />
            </button>
          </div>
        </Field>

        {/* Stock management */}
        <label className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3">
          <span className="text-sm font-medium">Lacak Stok</span>
          <input
            type="checkbox"
            checked={trackStock}
            onChange={(e) => setTrackStock(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-accent-gold)]"
          />
        </label>

        {trackStock && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stok Saat Ini" error={errors.stock}>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </Field>
            <Field label="Batas Stok Menipis" error={errors.lowStockThreshold}>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={lowStock}
                onChange={(e) => setLowStock(e.target.value)}
              />
            </Field>
          </div>
        )}

        <Field label="Deskripsi" error={errors.description}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opsional"
            rows={2}
          />
        </Field>

        <label className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3">
          <span className="text-sm font-medium">Produk Aktif</span>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-accent-gold)]"
          />
        </label>
      </form>

      <BarcodeScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={(code) => {
          setBarcode(code);
          setScanOpen(false);
          toast.success("Barcode terdeteksi");
        }}
      />
      <PriceCalculator
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        initialCost={parseRupiah(buyPrice)}
        onApply={(price) => {
          setSellPrice(formatThousands(String(price)));
          setCalcOpen(false);
        }}
      />
    </Drawer>
  );
}
