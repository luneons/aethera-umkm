"use client";

import { create } from "zustand";
import type { User } from "@/lib/db/types";

interface SessionState {
  currentUser: User | null;
  setUser: (user: User | null) => void;
  isOwner: () => boolean;
  canManageBusiness: () => boolean;
}

export const useSession = create<SessionState>((set, get) => ({
  currentUser: null,
  setUser: (user) => set({ currentUser: user }),
  isOwner: () => get().currentUser?.role === "pemilik",
  // No active user means single-owner mode for backwards compatibility.
  canManageBusiness: () => get().currentUser === null || get().currentUser?.role === "pemilik",
}));

export function canCurrentUserManageBusiness(): boolean {
  return useSession.getState().canManageBusiness();
}
