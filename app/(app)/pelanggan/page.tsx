"use client";

import { useEffect, useState } from "react";
import { Plus, UserCircle, Pencil, Trash2, Phone, TrendingUp, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Drawer } from "@/components/ui/Drawer";
import { Field, Input } from "@/components/ui/Input";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getCustomerSaleHistory } from "@/lib/db/queries/customers";
import { useConfirm } from "@/lib/stores/useConfirm";
import { toast } from "@/lib/stores/useToastStore";
import { formatRupiah, formatDateTime } from "@/lib/utils/format";
import type { Customer } from "@/lib/db/types";

function CustomerForm({ open, onClose, customer, onSaved }: { open: boolean; onClose: () => void; customer: Customer | null; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(customer?.name ?? "");
    setPhone(customer?.phone ?? "");
    setAddress(customer?.address ?? "");
    setNotes(customer?.notes ?? "");
  }, [open, customer]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Nama pelanggan wajib diisi"); return; }
    setSaving(true);
    try {
      if (customer) await updateCustomer(customer.id, { name: name.trim(), phone: phone || null, address: address || null, notes: notes || null });
      else await createCustomer({ name: name.trim(), phone: phone || null, address: address || null, notes: notes || null });
      toast.success(customer ? "Pelanggan diperbarui" : "Pelanggan ditambahkan");
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
      title={customer ? "Edit Pelanggan" : "Tambah Pelanggan"}
      footer={<Button fullWidth size="lg" loading={saving} type="submit" form="customer-form">Simpan</Button>}
    >
      <form id="customer-form" onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nama Pelanggan" required>
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

export default function PelangganPage() {
  const confirm = useConfirm((s) => s.confirm);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [stats, setStats] = useState<Record<number, { total_amount: number; count: number; last_at: string | null }>>({});

  const load = async () => {
    setLoading(true);
    const rows = await getCustomers(false);
    setCustomers(rows);
    setLoading(false);
    const statMap: typeof stats = {};
    for (const c of rows) {
      statMap[c.id] = await getCustomerSaleHistory(c.id);
    }
    setStats(statMap);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (c: Customer) => {
    const ok = await confirm({ title: "Hapus pelanggan?", message: `"${c.name}" akan dihapus. Riwayat transaksi tetap tersimpan.` });
    if (!ok) return;
    await deleteCustomer(c.id);
    toast.success("Pelanggan dihapus");
    load();
  };

  const handleWhatsApp = (c: Customer) => {
    if (!c.phone) { toast.error("Pelanggan ini tidak punya nomor WhatsApp"); return; }
    const num = c.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${num}`, "_blank");
  };

  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Pelanggan"
          subtitle="Kelola data & riwayat pelanggan"
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
          ) : customers.length === 0 ? (
            <EmptyState
              icon={UserCircle}
              title="Belum ada pelanggan"
              description="Tambahkan data pelanggan untuk melacak riwayat pembelian dan menghubungi via WhatsApp."
              action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus size={18} /> Tambah Pelanggan</Button>}
            />
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {customers.map((c) => {
                const stat = stats[c.id];
                return (
                  <div key={c.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--color-bg-elevated)] text-[var(--color-accent-gold)]">
                      <UserCircle size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      {c.phone && (
                        <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                          <Phone size={11} /> {c.phone}
                        </span>
                      )}
                      {stat && stat.count > 0 ? (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--color-success)]">
                          <TrendingUp size={11} />
                          {stat.count}x beli · Total {formatRupiah(stat.total_amount)}
                          {stat.last_at && ` · Terakhir ${formatDateTime(stat.last_at)}`}
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--color-text-muted)]">Belum ada transaksi</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {c.phone && (
                        <button onClick={() => handleWhatsApp(c)} aria-label="WhatsApp"
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[#25D366]">
                          <MessageCircle size={15} />
                        </button>
                      )}
                      <button onClick={() => { setEditing(c); setFormOpen(true); }} aria-label="Edit"
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-info)]">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(c)} aria-label="Hapus"
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

      <CustomerForm open={formOpen} onClose={() => setFormOpen(false)} customer={editing} onSaved={load} />
    </PageTransition>
  );
}
