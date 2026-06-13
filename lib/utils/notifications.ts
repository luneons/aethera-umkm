"use client";

/**
 * Notification Reminder System for AETHERA UMKM.
 * Uses the Web Notifications API when permission is granted,
 * otherwise falls back to an in-app toast.
 */

import { getSetting, setSetting } from "@/lib/db/queries/settings";
import { toast } from "@/lib/stores/useToastStore";

const REMINDER_KEY = "reminder_time"; // stored as "HH:MM"
const REMINDER_ENABLED_KEY = "reminder_enabled"; // "1" or "0"
const REMINDER_LAST_SHOWN_KEY = "reminder_last_shown"; // ISO date

let reminderInterval: ReturnType<typeof setInterval> | null = null;

/** Request notification permission from the browser. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
}

/** Get the current notification permission state. */
export function getPermissionState(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Get the saved reminder time (HH:MM) or null. */
export async function getReminderTime(): Promise<string | null> {
  return getSetting(REMINDER_KEY);
}

/** Get whether reminder is enabled. */
export async function isReminderEnabled(): Promise<boolean> {
  const val = await getSetting(REMINDER_ENABLED_KEY);
  return val === "1";
}

/** Save the reminder settings. */
export async function setReminderSettings(enabled: boolean, time: string): Promise<void> {
  await setSetting(REMINDER_ENABLED_KEY, enabled ? "1" : "0");
  await setSetting(REMINDER_KEY, time);
}

/** Show a notification (either native or in-app fallback). */
function showReminder() {
  const title = "AETHERA UMKM";
  const body = "Jangan lupa catat transaksi hari ini! 📝";

  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-96.png",
        tag: "daily-reminder",
      } as NotificationOptions);
    } catch {
      // SW notification fallback for mobile
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-96.png",
            tag: "daily-reminder",
          });
        });
      } else {
        toast.info(body);
      }
    }
  } else {
    toast.info(body);
  }
}

/** Check if the reminder should fire right now. */
async function checkReminder() {
  const enabled = await isReminderEnabled();
  if (!enabled) return;

  const timeStr = await getReminderTime();
  if (!timeStr) return;

  const now = new Date();
  const [hh, mm] = timeStr.split(":").map(Number);
  if (now.getHours() !== hh || now.getMinutes() !== mm) return;

  // Don't repeat within the same day
  const today = now.toISOString().slice(0, 10);
  const lastShown = await getSetting(REMINDER_LAST_SHOWN_KEY);
  if (lastShown === today) return;

  await setSetting(REMINDER_LAST_SHOWN_KEY, today);
  showReminder();
}

/** Start the reminder interval checker (call on app mount). */
export function startReminderChecker() {
  if (reminderInterval) return;
  // Check every 30 seconds
  reminderInterval = setInterval(checkReminder, 30_000);
  // Also check immediately on start
  checkReminder();
}

/** Stop the reminder checker. */
export function stopReminderChecker() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
}
