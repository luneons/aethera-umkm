"use client";

import { create } from "zustand";
import { getDB } from "@/lib/db/client";
import {
  getBusinessProfile,
  getSetting,
  setSetting,
} from "@/lib/db/queries/settings";
import type { BusinessProfile } from "@/lib/db/types";

export type Theme = "dark" | "light" | "system";

interface AppState {
  ready: boolean;
  profile: BusinessProfile | null;
  theme: Theme;
  /** Bumped whenever data changes so views can refetch. */
  dataVersion: number;

  init: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  bumpData: () => void;
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  profile: null,
  theme: "dark",
  dataVersion: 0,

  init: async () => {
    await getDB();
    const profile = await getBusinessProfile();
    const savedTheme = ((await getSetting("theme")) as Theme | null) ?? "dark";
    applyTheme(savedTheme);
    set({ ready: true, profile, theme: savedTheme });
  },

  refreshProfile: async () => {
    const profile = await getBusinessProfile();
    set({ profile });
  },

  setTheme: async (theme) => {
    applyTheme(theme);
    set({ theme });
    await setSetting("theme", theme);
  },

  bumpData: () => set({ dataVersion: get().dataVersion + 1 }),
}));
