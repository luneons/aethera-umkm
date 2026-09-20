"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Plus, Trash2, Tag, Truck, User } from "lucide-react";
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
import { createSaleBatch, updateSale, getSaleById } from "@/lib/db/queries/sales";
import { createPurchaseBatch, updatePurchase, getPurchaseById } from "@/lib/db/queries/purchases";
import { getCategories } from "@/lib/db/queries/categories";
import { nextInvoiceNumber, nextPONumber } from "@/lib/db/queries/invoices";
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

interface CartLine {
  id: string; // local key
  productId: number | null;
  categoryId: number | null;
  name: string;
  quantity: string;
  unitPrice: string; // formatted
  discount: string;  // formatted discount amount per line
}

function emptyLine(): CartLine {
  return {
    id: crypto.randomUUID(),
    productId: null,
    categoryId: null,
    name: "",
    quantity: "1",
    unitPrice: "",
    discount: "0",
  };
}

interface FormState {
  supplier: string;
  supplierId: number | null;
  customerId: number | null;
  customerName: string;
  channel: string;
  paymentMethod: PaymentMethod;
  shippingFee: string;
  notes: string;
  transactionAt: string;
  invoiceNumber: string;
}

function emptyForm(): FormState {
  return {
    supplier: "",
    supplierId: null,
    customerId: null,
    customerName: "",
    channel: "langsung",
    paymentMethod: "tunai",
    shippingFee: "0",
    notes: "",
    transactionAt: toDatetimeLocal(),
    invoiceNumber: "",
  };
}

function lineTotal(line: CartLine): number {
  const qty = parseFloat(line.quantity || "0") || 0;
  const price = parseRupiah(line.unitPrice);
  const discount = parseRupiah(line.discount);
  return Math.max(0, qty * price - discount);
}

export function TransactionForm() {
  const { open, type, editId, close } = useTxDrawer();
  const [activeType, setActiveType] = useState<TxType>(type);
  const bumpData = useAppStore((s) => s.bumpData);
  const premiumActive = usePremium((s) => s.active);
  const currentUser = useSession((s) => s.currentUser);

  const [cart, setCart] = useState<CartLine[]>([emptyLine()]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanLineId, setScanLineId] = useState<string | null>(null);
  const [qrisOpen, setQrisOpen] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const isSale = activeType === "penjualan";

  const grandTotal = cart.reduce((sum, line) => sum + lineTotal(line), 0)
    + (parseRupiah(form.shippingFee) || 0);

  useEffect(() => setActiveType(type), [type]);

  useEffect(() => {
    if (!open) return;
    getCategories(activeType).then(setCategories);
  }, [open, activeType]);

  useEffect(() => {
    if (!open) return;
    if (editId == null) {
      setCart([emptyLine()]);
      setForm(emptyForm());
      setErrors({});
      return;
    }
    (async () => {
      if (isSale) {
        const s = await getSaleById(editId);
        if (s) {
          setCart([{
            id: crypto.randomUUID(),
            productId: s.product_id,
            categoryId: s.category_id,
            name: s.product_name,
            quantity: String(s.quantity),
            unitPrice: formatThousands(String(Math.round(s.unit_price))),
            discount: formatThousands(String(Math.round(s.discount_amount ?? 0))),
          }]);
          setForm({
            supplier: "",
            supplierId: null,
            customerId: s.customer_id ?? null,
            customerName: s.customer_name ?? "",
            channel: (s as { channel?: string }).channel || "langsung",
            paymentMethod: s.payment_method,
            shippingFee: formatThousands(String(Math.round(s.shipping_fee ?? 0))),
            notes: s.notes ?? "",
            transactionAt: toDatetimeLocal(fromSqlDateTime(s.transaction_at)),
            invoiceNumber: s.invoice_number ?? "",
          });
        }
      } else {
        const p = await getPurchaseById(editId);
        if (p) {
          setCart([{
            id: crypto.randomUUID(),
            productId: p.product_id,
            categoryId: p.category_id,
            name: p.item_name,
            quantity: String(p.quantity),
            unitPrice: formatThousands(String(Math.round(p.unit_price))),
            discount: formatThousands(String(Math.round(p.discount_amount ?? 0))),
          }]);
          setForm({
            supplier: p.supplier ?? "",
            supplierId: (p as { supplier_id?: number | null }).supplier_id ?? null,
            customerId: null,
            customerName: "",
            channel: (p as { channel?: string }).channel || "langsung",
            paymentMethod: p.payment_method,
            shippingFee: formatThousands(String(Math.round(p.shipping_fee ?? 0))),
            notes: p.notes ?? "",
            transactionAt: toDatetimeLocal(fromSqlDateTime(p.transaction_at)),
            invoiceNumber: p.invoice_number ?? "",
          });
        }
      }
    })();
  }, [open, editId, isSale]);

  const setFormField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateLine = <K extends keyof CartLine>(id: string, key: K, value: CartLine[K]) => {
    setCart((c) => c.map((line) => line.id === id ? { ...line, [key]: value } : line));
  };

  const handleSelectProduct = (lineId: string, p: Product) => {
    setCart((c) => c.map((line) => line.id === lineId ? {
      ...line,
      name: p.name,
      productId: p.id,
      categoryId: p.category_id,
      unitPrice: formatThousands(String(Math.round(isSale ? p.sell_price : p.buy_price))),
    } : line));
  };

  const addLine = () => setCart((c) => [...c, emptyLine()]);
  const removeLine = (id: string) => {
    if (cart.length === 1) return; // keep at least one line
    setCart((c) => c.filter((l) => l.id !== id));
  };

  const handleGenerateInvoice = async () => {
    const num = isSale ? await nextInvoiceNumber() : await nextPONumber();
    setFormField("invoiceNumber", num);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    cart.forEach((line, i) => {
      if (!line.name.trim()) errs[`name_${i}`] = "Nama wajib diisi";
      if (!parseFloat(line.quantity) || parseFloat(line.quantity) <= 0) errs[`qty_${i}`] = "Jumlah > 0";
      if (!parseRupiah(line.unitPrice) || parseRupiah(line.unitPrice) <= 0) errs[`price_${i}`] = "Harga > 0";
    });
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      shake(formRef.current);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (isSale) {
        if (editId != null) {
          // Edit: only update the first line (single item for existing records)
          const line = cart[0];
          await updateSale(editId, {
            productId: line.productId,
            productName: line.name,
            categoryId: line.categoryId,
            quantity: parseFloat(line.quantity),
            unitPrice: parseRupiah(line.unitPrice),
            totalAmount: lineTotal(line) + parseRupiah(form.shippingFee),
            discountAmount: parseRupiah(line.discount),
            shippingFee: parseRupiah(form.shippingFee),
            paymentMethod: form.paymentMethod,
            channel: form.channel || null,
            notes: form.notes || null,
            transactionAt: form.transactionAt,
            customerId: form.customerId,
            customerName: form.customerName || null,
            invoiceNumber: form.invoiceNumber || null,
            cashierId: currentUser?.id ?? null,
            cashierName: currentUser?.name ?? null,
          });
        } else {
          // Create all cart rows atomically so partial invoices cannot be saved.
          await createSaleBatch(cart.map((line, index) => ({
            productId: line.productId,
            productName: line.name,
            categoryId: line.categoryId,
            quantity: parseFloat(line.quantity),
            unitPrice: parseRupiah(line.unitPrice),
            totalAmount: lineTotal(line),
            discountAmount: parseRupiah(line.discount),
            shippingFee: index === 0 ? parseRupiah(form.shippingFee) : 0,
            paymentMethod: form.paymentMethod,
            channel: form.channel || null,
            notes: form.notes || null,
            transactionAt: form.transactionAt,
            customerId: form.customerId,
            customerName: form.customerName || null,
            invoiceNumber: form.invoiceNumber || null,
            cashierId: currentUser?.id ?? null,
            cashierName: currentUser?.name ?? null,
          })));
          if (premiumActive)
            void fireWebhook("sale.created", { total: grandTotal, channel: form.channel });
        }
      } else {
        if (editId != null) {
          const line = cart[0];
          await updatePurchase(editId, {
            productId: line.productId,
            itemName: line.name,
            categoryId: line.categoryId,
            quantity: parseFloat(line.quantity),
            unitPrice: parseRupiah(line.unitPrice),
            totalAmount: lineTotal(line) + parseRupiah(form.shippingFee),
            discountAmount: parseRupiah(line.discount),
            shippingFee: parseRupiah(form.shippingFee),
            supplier: form.supplier || null,
            supplierId: form.supplierId,
            paymentMethod: form.paymentMethod,
            channel: form.channel || null,
            notes: form.notes || null,
            transactionAt: form.transactionAt,
            invoiceNumber: form.invoiceNumber || null,
          });
        } else {
          await createPurchaseBatch(cart.map((line, index) => ({
            productId: line.productId,
            itemName: line.name,
            categoryId: line.categoryId,
            quantity: parseFloat(line.quantity),
            unitPrice: parseRupiah(line.unitPrice),
            totalAmount: lineTotal(line),
            discountAmount: parseRupiah(line.discount),
            shippingFee: index === 0 ? parseRupiah(form.shippingFee) : 0,
            supplier: form.supplier || null,
            supplierId: form.supplierId,
            paymentMethod: form.paymentMethod,
            channel: form.channel || null,
            notes: form.notes || null,
            transactionAt: form.transactionAt,
            invoiceNumber: form.invoiceNumber || null,
          })));
          if (premiumActive)
            void fireWebhook("purchase.created", { total: grandTotal });
        }
      }
      successPulse(formRef.current);
      bumpData();
      void evaluateAchievements();
      toast.success(editId != null ? "Transaksi diperbarui!" : "Transaksi tersimpan!");
      setTimeout(close, 250);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan transaksi");
    } finally {
      setSaving(false);
    }
  };

  const title = editId != null
    ? isSale ? "Edit Penjualan" : "Edit Pembelian"
    : isSale ? "Catat Penjualan" : "Catat Pembelian";

  return (
    <Drawer
      open={open}
      onClose={close}
      title={title}
      footer={
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between rounded-xl bg-[var(--color-bg-elevated)] px-4 py-3">
            <span className="text-sm text-[var(--color-text-secondary)]">Grand Total</span>
            <span className="text-xl font-extrabold" style={{ color: isSale ? "var(--color-success)" : "var(--color-danger)" }}>
              {formatRupiah(grandTotal)}
            </span>
          </div>
          <Button fullWidth size="lg" loading={saving} onClick={() => formRef.current?.requestSubmit()}>
            {editId != null ? "Simpan Perubahan" : "Simpan Transaksi"}
          </Button>
        </div>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Type toggle */}
        {editId == null && (
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--color-bg-card)] p-1">
            <button type="button" onClick={() => { setActiveType("penjualan"); setCart([emptyLine()]); }}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${isSale ? "bg-[var(--color-success)]/20 text-[var(--color-success)]" : "text-[var(--color-text-muted)]"}`}>
              Penjualan
            </button>
            <button type="button" onClick={() => { setActiveType("pembelian"); setCart([emptyLine()]); }}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${!isSale ? "bg-[var(--color-danger)]/20 text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"}`}>
              Pembelian
            </button>
          </div>
        )}

        {/* Invoice number */}
        <div className="flex gap-2">
          <Field label="No. Nota / Invoice">
            <Input
              value={form.invoiceNumber}
              onChange={(e) => setFormField("invoiceNumber", e.target.value)}
              placeholder="Opsional — atau generate otomatis"
            />
          </Field>
          <div className="flex items-end">
            <Button type="button" variant="outline" size="sm" onClick={handleGenerateInvoice} title="Generate nomor otomatis">
              Auto
            </Button>
          </div>
        </div>

        {/* Cart lines */}
        <div className="flex flex-col gap-3">
          {cart.map((line, idx) => (
            <div key={line.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                  {isSale ? "Produk" : "Barang"} {cart.length > 1 ? `#${idx + 1}` : ""}
                </span>
                {cart.length > 1 && (
                  <button type="button" onClick={() => removeLine(line.id)} className="grid h-6 w-6 place-items-center rounded text-[var(--color-danger)]">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <Field label="" error={errors[`name_${idx}`]}>
                <ProductAutocomplete
                  value={line.name}
                  onChange={(v) => updateLine(line.id, "name", v)}
                  onSelect={(p) => handleSelectProduct(line.id, p)}
                  invalid={!!errors[`name_${idx}`]}
                  placeholder={isSale ? "Cari atau ketik produk" : "Cari atau ketik barang"}
                />
              </Field>

              {/* Category per line */}
              <Select
                value={line.categoryId ?? ""}
                onChange={(e) => updateLine(line.id, "categoryId", e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Tanpa kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Jumlah" error={errors[`qty_${idx}`]}>
                  <Input
                    type="number" inputMode="decimal" min="0" step="any"
                    value={line.quantity}
                    onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                    invalid={!!errors[`qty_${idx}`]}
                  />
                </Field>
                <Field label="Harga Satuan" error={errors[`price_${idx}`]}>
                  <div className="flex gap-1.5">
                    <Input
                      inputMode="numeric"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(line.id, "unitPrice", formatThousands(e.target.value))}
                      placeholder="0"
                      invalid={!!errors[`price_${idx}`]}
                    />
                    <button type="button" onClick={() => { setScanLineId(line.id); setScanOpen(true); }}
                      aria-label="Scan nota" title="Scan nota / struk"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--color-border)] text-[var(--color-accent-gold)] hover:bg-[var(--color-bg-elevated)]">
                      <Camera size={18} />
                    </button>
                  </div>
                </Field>
              </div>

              {/* Discount per line */}
              <Field label="Diskon (Rp)" hint="Diskon per item baris ini">
                <div className="flex items-center gap-2">
                  <Tag size={15} className="shrink-0 text-[var(--color-text-muted)]" />
                  <Input
                    inputMode="numeric"
                    value={line.discount}
                    onChange={(e) => updateLine(line.id, "discount", formatThousands(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </Field>

              <div className="flex items-center justify-between rounded-lg bg-[var(--color-bg-elevated)] px-3 py-2">
                <span className="text-xs text-[var(--color-text-muted)]">Subtotal</span>
                <span className="text-sm font-bold" style={{ color: isSale ? "var(--color-success)" : "var(--color-danger)" }}>
                  {formatRupiah(lineTotal(line))}
                </span>
              </div>
            </div>
          ))}

          {/* Add line button */}
          {editId == null && (
            <button type="button" onClick={addLine}
              className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-accent-gold)] hover:text-[var(--color-accent-gold)]">
              <Plus size={16} /> Tambah item lagi
            </button>
          )}
        </div>

        {/* Shipping fee */}
        <Field label="Ongkos Kirim" hint="Opsional">
          <div className="flex items-center gap-2">
            <Truck size={15} className="shrink-0 text-[var(--color-text-muted)]" />
            <Input
              inputMode="numeric"
              value={form.shippingFee}
              onChange={(e) => setFormField("shippingFee", formatThousands(e.target.value))}
              placeholder="0"
            />
          </div>
        </Field>

        {/* Customer / Supplier */}
        {isSale ? (
          <Field label="Nama Pelanggan" hint="Opsional — untuk riwayat pelanggan">
            <div className="flex items-center gap-2">
              <User size={15} className="shrink-0 text-[var(--color-text-muted)]" />
              <Input
                value={form.customerName}
                onChange={(e) => setFormField("customerName", e.target.value)}
                placeholder="Umum"
              />
            </div>
          </Field>
        ) : (
          <Field label="Supplier / Vendor">
            <Input
              value={form.supplier}
              onChange={(e) => setFormField("supplier", e.target.value)}
              placeholder="Opsional"
            />
          </Field>
        )}

        {/* Channel (sale only) */}
        {isSale && (
          <Field label="Saluran Penjualan">
            <Select value={form.channel} onChange={(e) => setFormField("channel", e.target.value)}>
              {SALES_CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Metode Bayar">
            <Select value={form.paymentMethod} onChange={(e) => setFormField("paymentMethod", e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tanggal & Jam">
            <Input type="datetime-local" value={form.transactionAt} onChange={(e) => setFormField("transactionAt", e.target.value)} />
          </Field>
        </div>

        <Field label="Catatan">
          <Textarea value={form.notes} onChange={(e) => setFormField("notes", e.target.value)} placeholder="Opsional" rows={2} />
        </Field>

        {isSale && form.paymentMethod === "qris" && grandTotal > 0 && (
          <Button type="button" variant="outline" onClick={() => setQrisOpen(true)}>
            Tampilkan QRIS Pembayaran
          </Button>
        )}
      </form>

      <ReceiptScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onAmount={(amount) => {
          if (scanLineId) {
            updateLine(scanLineId, "unitPrice", formatThousands(String(amount)));
            updateLine(scanLineId, "quantity", "1");
          }
        }}
      />
      <QrisModal open={qrisOpen} onClose={() => setQrisOpen(false)} amount={grandTotal} />
    </Drawer>
  );
}
