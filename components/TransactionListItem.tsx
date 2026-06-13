"use client";

import { useRef, useState } from "react";
import { Pencil, Trash2, ArrowUpRight, ArrowDownRight, Printer } from "lucide-react";
import { formatRupiah, formatDateTime } from "@/lib/utils/format";

interface Props {
  id: number;
  kind: "penjualan" | "pembelian";
  name: string;
  meta: string;
  amount: number;
  onEdit: () => void;
  onDelete: () => void;
  onPrint?: () => void;
}

const SWIPE_THRESHOLD = 64;
const ACTION_WIDTH = 132;

export function TransactionListItem({
  kind,
  name,
  meta,
  amount,
  onEdit,
  onDelete,
  onPrint,
}: Props) {
  const isSale = kind === "penjualan";
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const dragging = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setOffset(Math.max(dx, -ACTION_WIDTH));
    else if (offset < 0) setOffset(Math.min(0, offset + dx));
  };
  const onTouchEnd = () => {
    dragging.current = false;
    setOffset(offset <= -SWIPE_THRESHOLD ? -ACTION_WIDTH : 0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Actions behind */}
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={onEdit}
          aria-label="Edit"
          className="grid w-16 place-items-center bg-[var(--color-info)] text-white"
        >
          <Pencil size={18} />
        </button>
        <button
          onClick={onDelete}
          aria-label="Hapus"
          className="grid w-16 place-items-center bg-[var(--color-danger)] text-white"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div
        className="relative flex items-center gap-3 bg-[var(--color-bg-card)] py-3 pl-1 pr-2 transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
          style={{
            background: isSale ? "rgba(76,175,80,0.15)" : "rgba(244,67,54,0.15)",
            color: isSale ? "var(--color-success)" : "var(--color-danger)",
          }}
        >
          {isSale ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-[var(--color-text-muted)]">{meta}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className="text-sm font-semibold"
            style={{
              color: isSale ? "var(--color-success)" : "var(--color-danger)",
            }}
          >
            {isSale ? "+" : "-"}
            {formatRupiah(amount, false)}
          </span>
          {/* Desktop actions */}
          <div className="ml-1 hidden items-center gap-0.5 sm:flex">
            {onPrint && (
              <button
                onClick={onPrint}
                aria-label="Cetak struk"
                title="Cetak struk"
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-accent-gold)]"
              >
                <Printer size={15} />
              </button>
            )}
            <button
              onClick={onEdit}
              aria-label="Edit"
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-info)]"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              aria-label="Hapus"
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-danger)]"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { formatDateTime };
