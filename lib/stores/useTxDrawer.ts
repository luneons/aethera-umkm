"use client";

import { create } from "zustand";

export type TxType = "penjualan" | "pembelian";

interface TxDrawerState {
  open: boolean;
  type: TxType;
  editId: number | null;
  /** open the drawer; editId optional for editing an existing transaction */
  openDrawer: (type: TxType, editId?: number | null) => void;
  close: () => void;
}

export const useTxDrawer = create<TxDrawerState>((set) => ({
  open: false,
  type: "penjualan",
  editId: null,
  openDrawer: (type, editId = null) => set({ open: true, type, editId }),
  close: () => set({ open: false, editId: null }),
}));
