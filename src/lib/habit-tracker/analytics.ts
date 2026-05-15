import { loadData, logKey } from './store';
import type { HabitTrackerData } from './store';

/** Current consecutive-day streak for a habit. Counts today if complete, else starts from yesterday. */
export function currentStreak(data: HabitTrackerData, userId: string, habitId: string): number {
  const today = new Date();
  const todayK = logKey(userId, today.getFullYear(), today.getMonth(), today.getDate(), habitId);
  const d = new Date(today);
  if (!data.log[todayK]) d.setDate(d.getDate() - 1); // start from yesterday if today not done

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const k = logKey(userId, d.getFullYear(), d.getMonth(), d.getDate(), habitId);
    if (data.log[k]) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

/** Best ever streak for a habit (scans up to 2 years back). */
export function bestStreak(data: HabitTrackerData, userId: string, habitId: string): number {
  let best = 0;
  let cur = 0;
  const d = new Date();
  for (let i = 0; i < 730; i++) {
    const k = logKey(userId, d.getFullYear(), d.getMonth(), d.getDate(), habitId);
    if (data.log[k]) { cur++; if (cur > best) best = cur; }
    else cur = 0;
    d.setDate(d.getDate() - 1);
  }
  return best;
}

/** Last N days completion for a habit. Index 0 = oldest, last = today. */
export function recentDays(
  data: HabitTrackerData,
  userId: string,
  habitId: string,
  days = 7
): { date: Date; done: boolean }[] {
  const result: { date: Date; done: boolean }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = logKey(userId, d.getFullYear(), d.getMonth(), d.getDate(), habitId);
    result.push({ date: new Date(d), done: !!data.log[k] });
  }
  return result;
}

/** All days in a calendar month with completion flag. Returns array[0..daysInMonth-1]. */
export function monthDays(
  data: HabitTrackerData,
  userId: string,
  habitId: string,
  year: number,
  month: number
): boolean[] {
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const k = logKey(userId, year, month, i + 1, habitId);
    return !!data.log[k];
  });
}

/** Weekly completion rate (0–1) for each habit over the past 7 days. */
export function weeklyRate(data: HabitTrackerData, userId: string, habitId: string): number {
  const days = recentDays(data, userId, habitId, 7);
  return days.filter((d) => d.done).length / 7;
}

export { loadData };
