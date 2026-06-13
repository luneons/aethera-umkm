/** Format a number as Indonesian Rupiah. */
export function formatRupiah(value: number, withSymbol = true): string {
  const rounded = Math.round(value || 0);
  const formatted = new Intl.NumberFormat("id-ID").format(rounded);
  return withSymbol ? `Rp ${formatted}` : formatted;
}

/** Parse a rupiah-formatted / digit-grouped string back to a number. */
export function parseRupiah(value: string): number {
  const digits = (value || "").replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

/** Group digits with thousand separators while typing (no symbol). */
export function formatThousands(value: string): string {
  const digits = (value || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(parseInt(digits, 10));
}

const TIME_ZONE = "Asia/Jakarta";

/** ISO-ish local datetime string in SQLite format: YYYY-MM-DD HH:MM:SS */
export function toSqlDateTime(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** Value for <input type="datetime-local"> from a Date. */
export function toDatetimeLocal(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Parse a stored SQLite datetime ("YYYY-MM-DD HH:MM:SS") into a Date. */
export function fromSqlDateTime(value: string): Date {
  if (!value) return new Date();
  // Treat stored value as local time.
  const normalized = value.replace(" ", "T");
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date(value) : d;
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? fromSqlDateTime(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? fromSqlDateTime(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatTime(value: string | Date): string {
  const d = typeof value === "string" ? fromSqlDateTime(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDayName(value: string | Date): string {
  const d = typeof value === "string" ? fromSqlDateTime(value) : value;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

/** Greeting based on current hour. */
export function getGreeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

/** Percentage delta between current and previous. Returns null if no baseline. */
export function percentDelta(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export { TIME_ZONE };
