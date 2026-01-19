import { format, formatDistanceToNow, parseISO, startOfWeek, endOfWeek, subWeeks, getISOWeek, getYear } from "date-fns";

/** Format currency with abbreviation for large values */
export function formatCurrency(value: number, abbreviated = true): string {
  if (abbreviated) {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    }
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format currency with full precision */
export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format number with commas */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Format percentage with sign */
export function formatPercent(value: number, showSign = true): string {
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/** Format change with sign and color indicator */
export function formatChange(value: number, format: "currency" | "number" | "percent" = "number"): string {
  const sign = value > 0 ? "+" : "";
  switch (format) {
    case "currency":
      return `${sign}${formatCurrency(value)}`;
    case "percent":
      return formatPercent(value);
    default:
      return `${sign}${formatNumber(value)}`;
  }
}

/** Get ISO week ID (e.g., "2025-W03") */
export function getWeekId(date: Date): string {
  const week = getISOWeek(date);
  const year = getYear(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Format date for display */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

/** Format date short */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d");
}

/** Format relative time */
export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/** Format week range for display */
export function formatWeekRange(date: Date): string {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}

/** Get previous week date */
export function getPreviousWeek(date: Date, weeks = 1): Date {
  return subWeeks(date, weeks);
}

/** Get week start (Monday) */
export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/** Get week end (Sunday) */
export function getWeekEnd(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: 1 });
}
