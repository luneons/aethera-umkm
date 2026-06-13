"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Field, Input, Select } from "@/components/ui/Input";
import { formatThousands, parseRupiah, toDatetimeLocal, fromSqlDateTime } from "@/lib/utils/format";
import { createRecurring, updateRecurring } from "@/lib/db/queries/recurring";
import { getCategories } from "@/lib/db/queries/categories";
import { toast } from "@/lib/stores/useToastStore";
import type { Category, PaymentMethod, Recurring, TxKind } from "@/lib/db/types";

interface Props {
  open: boolean;
  onClose: () => void;
  item: Recurring | null;
  onSaved: () => void;
}

export function RecurringForm({ open, onClose, item, onSaved }: Props) {
  const [kind, setKind] = useState<TxKind>("pembelian");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [frequency, setFrequency] = useState<"harian" | "mingguan" | "bulanan">("bulanan");
  const [nextRun, setNextRun] = useState(toDatetimeLocal());
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (open) getCategories(kind).then(setCategories);
  }, [open, kind]);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setKind(item.kind);
      setName(item.name);
      setCategoryId(item.category_id);
      setQuantity(String(item.quantity));
      setUnitPrice(formatThousands(String(Math.round(item.unit_price))));
      setFrequency(item.frequency);
      setNextRun(toDatetimeLocal(fromSqlDateTime(item.next_run)));
    } else {
      setKind("pembelian");
      setName("");
      setCategoryId(null);
      setQuantity("1");
      setUnitPrice("");
      setFrequency("bulanan");
      setNextRun(toDatetimeLocal());
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !parseRupiah(unitPrice)) {
      toast.error("Nama dan harga wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kind,
        name: name.trim(),
        categoryId,
        quantity: parseFloat(quantity) || 1,
        unitPrice: parseRupiah(unitPrice),
        paymentMethod: "tunai" as PaymentMethod,
        channel: null,
        notes: null,
        frequency,
        nextRun,
      };
      if (item) await updateRecurring(item.id, payload);
      else await createRecurring(payload);
      toast.success(item ? "Template diperbarui" : "Template berulang dibuat");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={item ? "Edit Transaksi Berulang" : "Transaksi Berulang"}
      footer={
        <Button fullWidth size="lg" loading={saving} onClick={() => formRef.current?.requestSubmit()}>
          Simpan
        </Button>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--color-bg-card)] p-1">
          <button
            type="button"
            onClick={() => setKind("penjualan")}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              kind === "penjualan"
                ? "bg-[var(--color-success)]/20 text-[var(--color-success)]"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            Penjualan
          </button>
          <button
            type="button"
            onClick={() => setKind("pembelian")}
            className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
              kind === "pembelian"
                ? "bg-[var(--color-danger)]/20 text-[var(--color-danger)]"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            Pembelian
          </button>
        </div>

        <Field label="Nama / Keterangan" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Sewa kios" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Jumlah">
            <Input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field label="Harga Satuan" required>
            <Input
              inputMode="numeric"
              value={unitPrice}
              onChange={(e) => setUnitPrice(formatThousands(e.target.value))}
              placeholder="0"
            />
          </Field>
        </div>

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
          <Field label="Frekuensi">
            <Select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as "harian" | "mingguan" | "bulanan")}
            >
              <option value="harian">Harian</option>
              <option value="mingguan">Mingguan</option>
              <option value="bulanan">Bulanan</option>
            </Select>
          </Field>
          <Field label="Jadwal Berikutnya">
            <Input
              type="datetime-local"
              value={nextRun}
              onChange={(e) => setNextRun(e.target.value)}
            />
          </Field>
        </div>
      </form>
    </Drawer>
  );
}
