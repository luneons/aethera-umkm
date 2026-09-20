"use client";

import { useEffect, useRef, useState } from "react";
import { Users, Plus, Pencil, Trash2, Crown, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { PremiumGate } from "@/components/PremiumGate";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Field, Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getUsers, createUser, updateUser, deleteUser } from "@/lib/db/queries/users";
import { usePremium } from "@/lib/stores/usePremium";
import { useSession } from "@/lib/stores/useSession";
import { useConfirm } from "@/lib/stores/useConfirm";
import { toast } from "@/lib/stores/useToastStore";
import type { User, UserRole } from "@/lib/db/types";

function UserForm({
  open,
  onClose,
  user,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("kasir");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? "");
    setRole(user?.role ?? "kasir");
    setPin("");
  }, [open, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    if (!user && !/^\d{4,6}$/.test(pin)) {
      toast.error("PIN harus 4-6 digit");
      return;
    }
    if (user && pin && !/^\d{4,6}$/.test(pin)) {
      toast.error("PIN harus 4-6 digit");
      return;
    }
    setSaving(true);
    try {
      if (user) await updateUser(user.id, { name: name.trim(), role, pin: pin || undefined });
      else await createUser({ name: name.trim(), role, pin });
      toast.success(user ? "Pengguna diperbarui" : "Pengguna ditambahkan");
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
      title={user ? "Edit Pengguna" : "Tambah Pengguna"}
      footer={
        <Button fullWidth size="lg" loading={saving} onClick={() => formRef.current?.requestSubmit()}>
          Simpan
        </Button>
      }
    >
      <form ref={formRef} onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nama" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Peran">
          <Select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="kasir">Kasir</option>
            <option value="pemilik">Pemilik</option>
          </Select>
        </Field>
        <Field
          label={user ? "PIN Baru (kosongkan jika tidak diubah)" : "PIN (4-6 digit)"}
          required={!user}
        >
          <Input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
          />
        </Field>
        <p className="text-xs text-[var(--color-text-muted)]">
          Kasir dapat mencatat transaksi, tetapi peran Pemilik diperlukan untuk mengubah
          pengaturan & menghapus data.
        </p>
      </form>
    </Drawer>
  );
}

export default function PenggunaPage() {
  const checked = usePremium((s) => s.checked);
  const active = usePremium((s) => s.active);
  const confirm = useConfirm((s) => s.confirm);
  const canManageBusiness = useSession((s) => s.canManageBusiness());
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const load = () => {
    setLoading(true);
    getUsers().then((u) => {
      setUsers(u);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (active) load();
    else setLoading(false);
  }, [active]);

  const handleDelete = async (u: User) => {
    const ok = await confirm({
      title: "Hapus pengguna?",
      message: `Pengguna "${u.name}" akan dihapus.`,
    });
    if (!ok) return;
    await deleteUser(u.id);
    toast.success("Pengguna dihapus");
    load();
  };

  return (
    <PageTransition>
      <div>
        <PageHeader
          title="Pengguna"
          subtitle="Kelola kasir & pemilik"
          action={
            active && canManageBusiness ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus size={18} /> <span className="hidden sm:inline">Tambah</span>
              </Button>
            ) : null
          }
        />

        {active && !canManageBusiness && (
          <Card className="mb-4 border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10">
            <p className="text-sm text-[var(--color-warning)]">Hanya pemilik yang dapat mengelola pengguna.</p>
          </Card>
        )}

        {!checked ? null : !active ? (
          <PremiumGate feature="multi_user">{null}</PremiumGate>
        ) : (
          <Card className="overflow-hidden p-0">
            {loading ? (
              <div className="flex flex-col gap-3 p-4">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Belum ada pengguna tambahan"
                description="Tambahkan akun kasir agar karyawan bisa mencatat transaksi dengan PIN sendiri."
                action={
                  <Button
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus size={18} /> Tambah Pengguna
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
                      style={{
                        background:
                          u.role === "pemilik"
                            ? "rgba(245,166,35,0.15)"
                            : "var(--color-bg-elevated)",
                        color:
                          u.role === "pemilik"
                            ? "var(--color-accent-gold)"
                            : "var(--color-text-secondary)",
                      }}
                    >
                      {u.role === "pemilik" ? <Crown size={18} /> : <ShoppingCart size={18} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <p className="text-xs capitalize text-[var(--color-text-muted)]">
                        {u.role}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        disabled={!canManageBusiness}
                        onClick={() => {
                          if (!canManageBusiness) return;
                          setEditing(u);
                          setFormOpen(true);
                        }}
                        aria-label="Edit"
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-info)] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        disabled={!canManageBusiness}
                        onClick={() => handleDelete(u)}
                        aria-label="Hapus"
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {canManageBusiness && (
        <UserForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          user={editing}
          onSaved={load}
        />
      )}
    </PageTransition>
  );
}
