"use client";

import { useEffect, useState } from "react";
import { Plus, Truck, Pencil, Trash2, Phone, MapPin } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Drawer } from "@/components/ui/Drawer";
import { Field, Input } from "@/components/ui/Input";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplierPurchaseHistory } from "@/lib/db/queries/suppliers";
import { useConfirm } from "@/lib/stores/useConfirm";
import { toast } from "@/lib/stores/useToastStore";
import { formatRupiah, formatDateTime } from "@/lib/utils/format";
import type { Supplier } from "@/lib/db/types";

function SupplierForm({ open, onClose, supplier, onSaved }: { open: boolean; onClose: () => void; supplier: Supplier | null; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(supplier?.name ?? "");
    setPhone(supplier?.phone ?? "");
    setAddress(supplier?.address ?? "");
    setNotes(supplier?.notes ?? "");
  }, [open, supplier]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nama supplier wajib diisi"); return; }
    setSaving(true);
    try {
      if (supplier) await updateSupplier(supplier.id, { name: name.trim(), phone: phone || null, address: address || null, notes: notes || null });
      else await createSupplier({ name: name.trim(), phone: phone || null, address: address || null, notes: notes || null });
      toast.success(supplier ? "Supplier diperbarui" : "Supplier ditambahkan");
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
      title={supplier ? "Edit Supplier" : "Tambah Supplier"}
      footer={<Button fullWidth size="lg" loading={saving} type="submit" form="supplier-form">Simpan</Button>}
    >
      <form id="supplier-form" onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nama Supplier" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="No. Telepon / WhatsApp">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="628..." />
        </Field>
        <Field label="Alamat">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Opsional" />
        </Field>
        <Field label="Catatan">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" />
        </Field>
      </form>
    </Drawer>
  );
}

export default function SupplierPage() {
  const confirm = useConfirm((s) => s.confirm);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [stats, setStats] = useState<Record<number, { total_amount: number; count: number; last_at: string | null }>>({});

  const load = async () => {
    setLoading(true);
    const rows = await getSuppliers(false);
    setSuppliers(rows);
    setLoading(false);
    // Load stats for each
    const statMap: typeof stats = {};
    for (const s of rows) {
      statMap[s.id] = await getSupplierPurchaseHistory(s.id);
    }
    setStats(statMap);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (s: Supplier) => {
    const ok = await confirm({ title: "Hapus supplier?", message: `"${s.name}" akan dihapus.` });
    if (!ok) return;
    await deleteSupplier(s.id);
    toast.success("Supplier dihapus");
    load();
  };

  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Supplier"
          subtitle="Kelola data pemasok & vendor"
          action={
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus size={18} /> <span className="hidden sm:inline">Tambah</span>
            </Button>
          }
        />

        <Card className="overflow-hidden p-0">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : suppliers.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Belum ada supplier"
              description="Tambahkan data supplier untuk melacak pembelian per vendor dan mengelola kontak pemasok."
              action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={18} /> Tambah Supplier</Button>}
            />
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {suppliers.map((s) => {
                const stat = stats[s.id];
                return (
                  <div key={s.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-accent-gold)]">
                      <Truck size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {s.phone && (
                          <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                            <Phone size={11} /> {s.phone}
                          </span>
                        )}
                        {s.address && (
                          <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                            <MapPin size={11} /> {s.address}
                          </span>
                        )}
                      </div>
                      {stat && stat.count > 0 && (
                        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                          {stat.count}x beli · Total {formatRupiah(stat.total_amount)}
                          {stat.last_at && ` · Terakhir ${formatDateTime(stat.last_at)}`}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button onClick={() => { setEditing(s); setFormOpen(true); }} aria-label="Edit"
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-info)]">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(s)} aria-label="Hapus"
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-danger)]">
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

      <SupplierForm open={formOpen} onClose={() => setFormOpen(false)} supplier={editing} onSaved={load} />
    </PageTransition>
  );
}
