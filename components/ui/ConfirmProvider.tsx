"use client";

import { ConfirmDialog } from "./ConfirmDialog";
import { useConfirm } from "@/lib/stores/useConfirm";

export function ConfirmProvider() {
  const { open, title, message, confirmLabel, cancelLabel, danger, handle } =
    useConfirm();

  return (
    <ConfirmDialog
      open={open}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      danger={danger}
      onConfirm={() => handle(true)}
      onCancel={() => handle(false)}
    />
  );
}
