import type { WeekInfo } from "../types/index.js";

/** Get ISO week number and year for a date */
export function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return { week: weekNumber, year: d.getUTCFullYear() };
}

/** Format week ID as YYYY-Www */
export function formatWeekId(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** Get Monday of the ISO week */
export function getWeekStart(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

/** Get Sunday of the ISO week */
export function getWeekEnd(year: number, week: number): Date {
  const monday = getWeekStart(year, week);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return sunday;
}

/** Get current week info */
export function getCurrentWeek(): WeekInfo {
  const now = new Date();
  const { week, year } = getISOWeek(now);
  return {
    weekId: formatWeekId(year, week),
    weekNumber: week,
    year,
    startDate: getWeekStart(year, week),
    endDate: getWeekEnd(year, week),
  };
}

/** Get week info for a specific week ID */
export function parseWeekId(weekId: string): WeekInfo | null {
  const match = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);

  if (week < 1 || week > 53) return null;

  return {
    weekId,
    weekNumber: week,
    year,
    startDate: getWeekStart(year, week),
    endDate: getWeekEnd(year, week),
  };
}

/** Get previous week info */
export function getPreviousWeek(weekId: string): WeekInfo | null {
  const current = parseWeekId(weekId);
  if (!current) return null;

  let year = current.year;
  let week = current.weekNumber - 1;

  if (week < 1) {
    year--;
    // Get number of weeks in previous year
    const dec31 = new Date(Date.UTC(year, 11, 31));
    const { week: lastWeek } = getISOWeek(dec31);
    week = lastWeek;
  }

  return {
    weekId: formatWeekId(year, week),
    weekNumber: week,
    year,
    startDate: getWeekStart(year, week),
    endDate: getWeekEnd(year, week),
  };
}

/** Get list of past N weeks including current */
export function getLastNWeeks(n: number): WeekInfo[] {
  const weeks: WeekInfo[] = [];
  let current = getCurrentWeek();

  for (let i = 0; i < n; i++) {
    weeks.push(current);
    const prev = getPreviousWeek(current.weekId);
    if (!prev) break;
    current = prev;
  }

  return weeks;
}

/** Calculate weeks between two dates */
export function weeksBetween(startDate: Date, endDate: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerWeek);
}

/** Get week ID for a specific date */
export function getWeekIdForDate(date: Date): string {
  const { week, year } = getISOWeek(date);
  return formatWeekId(year, week);
}
