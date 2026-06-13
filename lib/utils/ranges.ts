import { toSqlDateTime } from "./format";

export interface Range {
  from: string; // sql datetime inclusive start
  to: string; // sql datetime inclusive end
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function build(start: Date, end: Date): Range {
  return {
    from: toSqlDateTime(start),
    to: toSqlDateTime(end),
    fromDate: ymd(start),
    toDate: ymd(end),
  };
}

export function todayRange(now = new Date()): Range {
  return build(startOfDay(now), endOfDay(now));
}

export function lastNDaysRange(n: number, now = new Date()): Range {
  const start = startOfDay(new Date(now));
  start.setDate(start.getDate() - (n - 1));
  return build(start, endOfDay(now));
}

export function thisWeekRange(now = new Date()): Range {
  const start = startOfDay(new Date(now));
  const day = (start.getDay() + 6) % 7; // Monday = 0
  start.setDate(start.getDate() - day);
  return build(start, endOfDay(now));
}

export function thisMonthRange(now = new Date()): Range {
  const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const end = endOfDay(now);
  return build(start, end);
}

export function previousMonthRange(now = new Date()): Range {
  const start = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
  return build(start, end);
}

export function yesterdayRange(now = new Date()): Range {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return build(startOfDay(y), endOfDay(y));
}

export function customRange(fromDate: string, toDate: string): Range {
  const start = startOfDay(new Date(fromDate + "T00:00:00"));
  const end = endOfDay(new Date(toDate + "T00:00:00"));
  return build(start, end);
}
