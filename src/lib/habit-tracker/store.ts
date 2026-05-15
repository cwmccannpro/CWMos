export interface HabitDef {
  id: string;
  name: string;
}

export interface HabitUser {
  id: string;
  name: string;
  habits: HabitDef[];
}

export interface HabitTrackerData {
  users: HabitUser[];
  /** Flat log. Key format: `${userId}|${YYYY-MM-DD}|${habitId}` */
  log: Record<string, boolean>;
}

const DEFAULT_DATA: HabitTrackerData = {
  users: [
    {
      id: 'user-cam',
      name: 'Cam',
      habits: [
        { id: 'viridian-top3', name: 'Viridian Top 3 complete?' },
        { id: 'gym', name: 'Gym?' },
        { id: 'hit-macros', name: 'Hit Macros?' },
        { id: 'read-5-pages', name: 'Read 5 pages?' },
      ],
    },
    {
      id: 'user-sahara',
      name: 'Sahara',
      habits: [],
    },
  ],
  log: {},
};

const STORAGE_KEY = 'cwm-habit-tracker';

export function loadData(): HabitTrackerData {
  if (typeof window === 'undefined') return JSON.parse(JSON.stringify(DEFAULT_DATA));
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DATA));
    return JSON.parse(raw) as HabitTrackerData;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

export function saveData(data: HabitTrackerData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function logKey(
  userId: string,
  year: number,
  month: number,
  day: number,
  habitId: string
): string {
  const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return `${userId}|${d}|${habitId}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function isToday(year: number, month: number, day: number): boolean {
  const t = new Date();
  return year === t.getFullYear() && month === t.getMonth() && day === t.getDate();
}

export function isFuture(year: number, month: number, day: number): boolean {
  const t = new Date();
  const todayMidnight = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  return new Date(year, month, day).getTime() > todayMidnight;
}
