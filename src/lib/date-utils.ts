export const CAIRO_TIME_ZONE = "Africa/Cairo";

const cairoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAIRO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

/**
 * Returns YYYY-MM-DD in Egypt (Africa/Cairo) local calendar time.
 */
export function getCairoDateKey(date: Date = new Date()): string {
  return cairoDateFormatter.format(date);
}

/**
 * Parses a YYYY-MM-DD string (or Date/ISO string) into a noon-UTC Date
 * (12:00:00.000Z) so the calendar day is invariant in Africa/Cairo (UTC+2),
 * UTC ISO slices, and browser timezones from UTC-11 to UTC+11.
 */
export function parseCalendarDate(input?: string | Date): Date {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new Error("Invalid date");
    }
    const key = getCairoDateKey(input);
    return parseCalendarDate(key);
  }

  if (typeof input === "string" && input.trim()) {
    const trimmed = input.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const d = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
      if (d.getUTCFullYear() === year && d.getUTCMonth() === month && d.getUTCDate() === day) {
        return d;
      }
      throw new Error("Invalid calendar date");
    }

    // ISO date-time string starting with YYYY-MM-DDT00:00:00 or YYYY-MM-DDT12:00:00Z
    const dateOnlyPrefix = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(?:00|12):00:00(?:\.000)?Z$/);
    if (dateOnlyPrefix) {
      return parseCalendarDate(`${dateOnlyPrefix[1]}-${dateOnlyPrefix[2]}-${dateOnlyPrefix[3]}`);
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parseCalendarDate(getCairoDateKey(parsed));
    }
    throw new Error("Invalid date format");
  }

  return parseCalendarDate(getCairoDateKey(new Date()));
}

/**
 * Adds calendar days to a noon-UTC Date (or YYYY-MM-DD string) while preserving noon UTC.
 */
export function addCalendarDays(base: Date | string, days: number): Date {
  const d = base instanceof Date ? base : parseCalendarDate(base);
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Adds calendar days and returns the YYYY-MM-DD date key.
 */
export function addCalendarDaysKey(base: Date | string, days: number): string {
  return toCalendarDateKey(addCalendarDays(base, days));
}

/**
 * Converts a stored Date or ISO string into a YYYY-MM-DD key using Africa/Cairo
 * for timestamps and preserving exact date-only UTC values (00:00Z / 12:00Z).
 */
export function toCalendarDateKey(input: Date | string): string {
  if (typeof input === "string") {
    const trimmed = input.trim();
    const exactMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (exactMatch) return trimmed;
    const utcMidnightOrNoon = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})T(?:00|12):00:00(?:\.000)?Z$/);
    if (utcMidnightOrNoon) {
      return `${utcMidnightOrNoon[1]}-${utcMidnightOrNoon[2]}-${utcMidnightOrNoon[3]}`;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return "";
    return getCairoDateKey(parsed);
  }

  if (Number.isNaN(input.getTime())) return "";
  return getCairoDateKey(input);
}

/**
 * Returns [startOfDayUTC, endOfDayUTC] bounds covering both 00:00:00Z and
 * 12:00:00Z stored dates as well as Cairo local-day timestamps.
 */
export function getCalendarDayBounds(dateKey: string): { start: Date; end: Date } {
  const match = dateKey.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    throw new Error("Invalid date key");
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return {
    start: new Date(Date.UTC(year, month, day, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, day, 23, 59, 59, 999))
  };
}
