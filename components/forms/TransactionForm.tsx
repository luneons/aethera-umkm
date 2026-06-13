"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Drawer } from "@/components/ui/Drawer";
import { ProductAutocomplete } from "./ProductAutocomplete";
import { ReceiptScanner } from "@/components/ReceiptScanner";
import { QrisModal } from "@/components/QrisModal";
import { SALES_CHANNELS } from "@/lib/constants";
import {
  formatThousands,
  parseRupiah,
  formatRupiah,
  toDatetimeLocal,
  fromSqlDateTime,
} from "@/lib/utils/format";
import { shake, successPulse } from "@/lib/animations/gsap";
import { saleSchema, purchaseSchema } from "@/lib/validations/transaction";
import { createSale, updateSale, getSaleById } from "@/lib/db/queries/sales";
import {
  createPurchase,
  updatePurchase,
  getPurchaseById,
} from "@/lib/db/queries/purchases";
import { getCategories } from "@/lib/db/queries/categories";
import { evaluateAchievements } from "@/lib/achievements";
import { fireWebhook } from "@/lib/integrations/webhook";
import { usePremium } from "@/lib/stores/usePremium";
import { useSession } from "@/lib/stores/useSession";
import type { Category, PaymentMethod, Product } from "@/lib/db/types";
import { useAppStore } from "@/lib/stores/useAppStore";
import { toast } from "@/lib/stores/useToastStore";
import { useTxDrawer, type TxType } from "@/lib/stores/useTxDrawer";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "tunai", label: "Tunai" },
  { value: "transfer", label: "Transfer" },
  { value: "qris", label: "QRIS" },
  { value: "lainnya", label: "Lainnya" },
];

interface FormState {
  name: string;
  productId: number | null;
  categoryId: number | null;
  quantity: string;
  unitPrice: string; // grouped string
  supplier: string;
  channel: string;
  paymentMethod: PaymentMethod;
  notes: string;
  transactionAt: string; // datetime-local
}

function emptyState(): FormState {
  return {
    name: "",
    productId: null,
    categoryId: null,
    quantity: "1",
    unitPrice: "",
    supplier: "",
    channel: "langsung",
    paymentMethod: "tunai",
    notes: "",
    transactionAt: toDatetimeLocal(),
  };
}

export function TransactionForm() {
  const { open, type, editId, close } = useTxDrawer();
  const [activeType, setActiveType] = useState<TxType>(type);
  const bumpData = useAppStore((s) => s.bumpData);
  const premiumActive = usePremium((s) => s.active);
  const currentUser = useSession((s) => s.currentUser);

  const [form, setForm] = useState<FormState>(emptyState());
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [qrisOpen, setQrisOpen] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => setActiveType(type), [type]);

  const isSale = activeType === "penjualan";
  const qtyNum = parseFloat(form.quantity || "0") || 0;
  const priceNum = parseRupiah(form.unitPrice);
  const total = qtyNum * priceNum;

  // Load categories when type changes / drawer opens.
  useEffect(() => {
    if (!open) return;
    getCategories(activeType).then(setCategories);
  }, [open, activeType]);

  // Load existing transaction for editing.
  useEffect(() => {
    if (!open) return;
    if (editId == null) {
      setForm(emptyState());
      setErrors({});
      return;
    }
    (async () => {
      if (isSale) {
        const s = await getSaleById(editId);
        if (s)
          setForm({
            name: s.product_name,
            productId: s.product_id,
            categoryId: s.category_id,
            quantity: String(s.quantity),
            unitPrice: formatThousands(String(Math.round(s.unit_price))),
            supplier: "",
            channel: (s as { channel?: string }).channel || "langsung",
            paymentMethod: s.payment_method,
            notes: s.notes ?? "",
            transactionAt: toDatetimeLocal(fromSqlDateTime(s.transaction_at)),
          });
      } else {
        const p = await getPurchaseById(editId);
        if (p)
          setForm({
            name: p.item_name,
            productId: p.product_id,
            categoryId: p.category_id,
            quantity: String(p.quantity),
            unitPrice: formatThousands(String(Math.round(p.unit_price))),
            supplier: p.supplier ?? "",
            channel: (p as { channel?: string }).channel || "langsung",
            paymentMethod: p.payment_method,
            notes: p.notes ?? "",
            transactionAt: toDatetimeLocal(fromSqlDateTime(p.transaction_at)),
          });
      }
    })();
  }, [open, editId, isSale]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSelectProduct = (p: Product) => {
    setForm((f) => ({
      ...f,
      name: p.name,
      productId: p.id,
      categoryId: p.category_id,
      unitPrice: formatThousands(
        String(Math.round(isSale ? p.sell_price : p.buy_price))
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      quantity: qtyNum,
      unitPrice: priceNum,
      totalAmount: total,
      paymentMethod: form.paymentMethod,
      channel: form.channel || undefined,
      notes: form.notes || undefined,
      categoryId: form.categoryId,
      productId: form.productId,
      transactionAt: form.transactionAt,
      ...(isSale
        ? { productName: form.name }
        : { itemName: form.name, supplier: form.supplier || undefined }),
    };

    const schema = isSale ? saleSchema : purchaseSchema;
    const result = schema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      shake(formRef.current);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (isSale) {
        const data = {
          productId: form.productId,
          productName: form.name,
          categoryId: form.categoryId,
          quantity: qtyNum,
          unitPrice: priceNum,
          totalAmount: total,
          paymentMethod: form.paymentMethod,
          channel: form.channel || null,
          notes: form.notes || null,
          transactionAt: form.transactionAt,
          cashierId: currentUser?.id ?? null,
          cashierName: currentUser?.name ?? null,
        };
        if (editId != null) await updateSale(editId, data);
        else {
          await createSale(data);
          if (premiumActive)
            void fireWebhook("sale.created", { name: form.name, total, channel: form.channel });
        }
      } else {
        const data = {
          productId: form.productId,
          itemName: form.name,
          categoryId: form.categoryId,
          quantity: qtyNum,
          unitPrice: priceNum,
          totalAmount: total,
          supplier: form.supplier || null,
          paymentMethod: form.paymentMethod,
          channel: form.channel || null,
          notes: form.notes || null,
          transactionAt: form.transactionAt,
        };
        if (editId != null) await updatePurchase(editId, data);
        else {
          await createPurchase(data);
          if (premiumActive)
            void fireWebhook("purchase.created", { name: form.name, total });
        }
      }
      successPulse(formRef.current);
      bumpData();
      void evaluateAchievements();
      toast.success(
        editId != null ? "Transaksi diperbarui!" : "Transaksi tersimpan!"
      );
      setTimeout(close, 250);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan transaksi");
    } finally {
      setSaving(false);
    }
  };

  const title =
    editId != null
      ? isSale
        ? "Edit Penjualan"
        : "Edit Pembelian"
      : isSale
      ? "Catat Penjualan"
      : "Catat Pembelian";

  return (
    <Drawer
      open={open}
      onClose={close}
      title={title}
      footer={
        <Button
          fullWidth
          size="lg"
          loading={saving}
          onClick={() => formRef.current?.requestSubmit()}
        >
          {editId != null ? "Simpan Perubahan" : "Simpan Transaksi"}
        </Button>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Type toggle (only when creating) */}
        {editId == null && (
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--color-bg-card)] p-1">
            <button
              type="button"
              onClick={() => setActiveType("penjualan")}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                isSale
                  ? "bg-[var(--color-success)]/20 text-[var(--color-success)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              Penjualan
            </button>
            <button
              type="button"
              onClick={() => setActiveType("pembelian")}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                !isSale
                  ? "bg-[var(--color-danger)]/20 text-[var(--color-danger)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              Pembelian
            </button>
          </div>
        )}

        <Field
          label={isSale ? "Nama Produk" : "Nama Barang / Bahan"}
          required
          error={errors.productName || errors.itemName}
        >
          <ProductAutocomplete
            value={form.name}
            onChange={(v) => set("name", v)}
            onSelect={handleSelectProduct}
            invalid={!!(errors.productName || errors.itemName)}
            placeholder={isSale ? "Cari atau ketik produk" : "Cari atau ketik barang"}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Jumlah" required error={errors.quantity}>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              invalid={!!errors.quantity}
            />
          </Field>
          <Field label="Harga Satuan" required error={errors.unitPrice}>
            <div className="flex gap-1.5">
              <Input
                inputMode="numeric"
                value={form.unitPrice}
                onChange={(e) => set("unitPrice", formatThousands(e.target.value))}
                placeholder="0"
                invalid={!!errors.unitPrice}
              />
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                aria-label="Scan nota"
                title="Scan nota / struk"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] text-[var(--color-accent-gold)] hover:bg-[var(--color-bg-elevated)]"
              >
                <Camera size={18} />
              </button>
            </div>
          </Field>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">Total</span>
            <span
              className="text-lg font-bold"
              style={{
                color: isSale ? "var(--color-success)" : "var(--color-danger)",
              }}
            >
              {formatRupiah(total)}
            </span>
          </div>
        </div>

        <Field label="Kategori">
          <Select
            value={form.categoryId ?? ""}
            onChange={(e) =>
              set("categoryId", e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Tanpa kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        {!isSale && (
          <Field label="Supplier / Vendor" error={errors.supplier}>
            <Input
              value={form.supplier}
              onChange={(e) => set("supplier", e.target.value)}
              placeholder="Opsional"
            />
          </Field>
        )}

        {isSale && (
          <Field label="Saluran Penjualan">
            <Select
              value={form.channel}
              onChange={(e) => set("channel", e.target.value)}
            >
              {SALES_CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Metode Bayar">
            <Select
              value={form.paymentMethod}
              onChange={(e) => set("paymentMethod", e.target.value as PaymentMethod)}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal & Jam" error={errors.transactionAt}>
            <Input
              type="datetime-local"
              value={form.transactionAt}
              onChange={(e) => set("transactionAt", e.target.value)}
              invalid={!!errors.transactionAt}
            />
          </Field>
        </div>

        <Field label="Catatan" error={errors.notes}>
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Opsional"
            rows={2}
          />
        </Field>

        {isSale && form.paymentMethod === "qris" && total > 0 && (
          <Button type="button" variant="outline" onClick={() => setQrisOpen(true)}>
            Tampilkan QRIS Pembayaran
          </Button>
        )}
      </form>

      <ReceiptScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onAmount={(amount) => {
          set("unitPrice", formatThousands(String(amount)));
          set("quantity", "1");
        }}
      />
      <QrisModal open={qrisOpen} onClose={() => setQrisOpen(false)} amount={total} />
    </Drawer>
  );
}
