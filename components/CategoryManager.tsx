"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import {
  getCategories,
  createCategory,
  deleteCategory,
} from "@/lib/db/queries/categories";
import { useConfirm } from "@/lib/stores/useConfirm";
import { toast } from "@/lib/stores/useToastStore";
import type { Category, CategoryType } from "@/lib/db/types";

const TYPE_LABEL: Record<CategoryType, string> = {
  penjualan: "Penjualan",
  pembelian: "Pembelian",
  both: "Keduanya",
};

export function CategoryManager({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const confirm = useConfirm((s) => s.confirm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("penjualan");
  const [saving, setSaving] = useState(false);

  const load = () => getCategories().then(setCategories);

  useEffect(() => {
    if (open) load();
  }, [open]);

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Nama kategori wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await createCategory({ name: name.trim(), type });
      setName("");
      toast.success("Kategori ditambahkan");
      await load();
    } catch {
      toast.error("Kategori sudah ada atau gagal disimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Category) => {
    const ok = await confirm({
      title: "Hapus kategori?",
      message: `Kategori "${c.name}" akan dihapus.`,
    });
    if (!ok) return;
    await deleteCategory(c.id);
    toast.success("Kategori dihapus");
    load();
  };

  return (
    <Drawer open={open} onClose={onClose} title="Kelola Kategori">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama kategori baru"
          />
          <div className="flex gap-2">
            <Select value={type} onChange={(e) => setType(e.target.value as CategoryType)}>
              <option value="penjualan">Penjualan</option>
              <option value="pembelian">Pembelian</option>
              <option value="both">Keduanya</option>
            </Select>
            <Button onClick={handleAdd} loading={saving}>
              <Plus size={18} /> Tambah
            </Button>
          </div>
        </div>

        <ul className="flex flex-col divide-y divide-[var(--color-border)]">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: c.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {TYPE_LABEL[c.type]}
                </p>
              </div>
              <button
                onClick={() => handleDelete(c)}
                aria-label="Hapus"
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-danger)]"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Drawer>
  );
}
