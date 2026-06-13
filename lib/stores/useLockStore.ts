"use client";

import { create } from "zustand";

interface LockState {
  locked: boolean;
  checked: boolean;
  lock: () => void;
  unlock: () => void;
  setChecked: (v: boolean) => void;
}

export const useLockStore = create<LockState>((set) => ({
  locked: false,
  checked: false,
  lock: () => set({ locked: true }),
  unlock: () => set({ locked: false }),
  setChecked: (v) => set({ checked: v }),
}));
