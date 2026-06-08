// Single source of truth for how calendar times are displayed.
//
// iCal feeds are authored in a specific wall-clock timezone (here, every TZID in
// the connected feeds is America/New_York). The API resolves each event to a
// correct absolute UTC instant; this module is the ONE place that decides which
// timezone those instants are rendered in.
//
// Why this matters: never read calendar instants with `getHours()` / `getUTCHours()`
// or format them without an explicit `timeZone`. Those depend on the ambient zone
// of whatever machine runs the code (browser vs. server vs. Cloudflare-UTC), so the
// same event renders differently in different places. Always go through this module
// so every surface — Master Controller, dashboard widgets, full calendar page —
// shows the identical, correct time regardless of where it runs.
//
// Configurable via NEXT_PUBLIC_CALENDAR_TZ (NEXT_PUBLIC_ so client bundles inline it).

export const CALENDAR_TZ =
  process.env.NEXT_PUBLIC_CALENDAR_TZ?.trim() || 'America/New_York';

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
  weekday: number; // 0=Sun … 6=Sat
}

const WEEKDAY: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CALENDAR_TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  weekday: 'short', hour12: false,
});

/** Break an instant into its wall-clock parts in the calendar timezone. */
export function zonedParts(instant: Date): ZonedParts {
  const parts = partsFormatter.formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10) % 24, // some runtimes emit '24' at midnight
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
    weekday: WEEKDAY[get('weekday')],
  };
}

/** Fractional hour-of-day (e.g. 7.5 for 7:30) in the calendar timezone — for grid positioning. */
export function zonedHourFloat(instant: Date): number {
  const { hour, minute } = zonedParts(instant);
  return hour + minute / 60;
}

/**
 * A "calendar date carrier": a UTC-midnight Date whose UTC y/m/d equal the calendar
 * date that `instant` falls on in the calendar timezone. Use carriers for all date-grid
 * math (week columns, month cells) and read them back with getUTC* — they hold a pure
 * date with no time-of-day, so they're immune to DST/offset shifts.
 */
export function zonedDateCarrier(instant: Date): Date {
  const p = zonedParts(instant);
  return new Date(Date.UTC(p.year, p.month - 1, p.day));
}

/** True if an event instant falls on the calendar date represented by a carrier. */
export function isInstantOnCarrierDay(instant: Date, carrier: Date): boolean {
  const p = zonedParts(instant);
  return (
    p.year === carrier.getUTCFullYear() &&
    p.month === carrier.getUTCMonth() + 1 &&
    p.day === carrier.getUTCDate()
  );
}

/** True if two carriers (or any two UTC-midnight dates) are the same calendar date. */
export function isSameCarrierDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/** Format an event instant's time in the calendar timezone (e.g. "7:35 AM"). */
export function formatZonedTime(instant: Date): string {
  return instant.toLocaleTimeString('en-US', {
    timeZone: CALENDAR_TZ,
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Format an event instant's date in the calendar timezone. */
export function formatZonedDate(instant: Date, opts: Intl.DateTimeFormatOptions): string {
  return instant.toLocaleDateString('en-US', { timeZone: CALENDAR_TZ, ...opts });
}
