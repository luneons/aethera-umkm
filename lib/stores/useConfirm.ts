"use client";

import { create } from "zustand";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: ((value: boolean) => void) | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  handle: (value: boolean) => void;
}

export const useConfirm = create<ConfirmState>((set, get) => ({
  open: false,
  title: "",
  message: "",
  resolve: null,
  confirm: (options) =>
    new Promise<boolean>((resolve) => {
      set({ ...options, open: true, resolve });
    }),
  handle: (value) => {
    get().resolve?.(value);
    set({ open: false, resolve: null });
  },
}));
