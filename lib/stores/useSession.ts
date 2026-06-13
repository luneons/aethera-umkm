"use client";

import { create } from "zustand";
import type { User } from "@/lib/db/types";

interface SessionState {
  currentUser: User | null;
  setUser: (user: User | null) => void;
  isOwner: () => boolean;
}

export const useSession = create<SessionState>((set, get) => ({
  currentUser: null,
  setUser: (user) => set({ currentUser: user }),
  isOwner: () => get().currentUser?.role === "pemilik",
}));
