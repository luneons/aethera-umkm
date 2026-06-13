"use client";

import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
        <div className="mb-3 flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-full"
            style={{
              background: danger ? "rgba(244,67,54,0.15)" : "rgba(245,166,35,0.15)",
              color: danger ? "var(--color-danger)" : "var(--color-accent-gold)",
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className="mb-5 text-sm text-[var(--color-text-secondary)]">{message}</p>
        <div className="flex gap-2">
          <Button variant="outline" fullWidth onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} fullWidth onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
