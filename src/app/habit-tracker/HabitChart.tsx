'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { HabitUser } from '@/lib/habit-tracker/store';
import { logKey, daysInMonth, isFuture } from '@/lib/habit-tracker/store';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface DayBar {
  day: number;
  pct: number;
  completed: number;
  total: number;
}

interface Props {
  user: HabitUser;
  year: number;
  month: number;
  log: Record<string, boolean>;
}

function computeMonthAvg(
  user: HabitUser,
  y: number,
  m: number,
  log: Record<string, boolean>
): number {
  const days = daysInMonth(y, m);
  const hCount = user.habits.length;
  if (hCount === 0) return 0;
  let done = 0;
  let total = 0;
  for (let d = 1; d <= days; d++) {
    if (isFuture(y, m, d)) continue;
    total += hCount;
    done += user.habits.filter((h) => !!log[logKey(user.id, y, m, d, h.id)]).length;
  }
  return total > 0 ? done / total : 0;
}

export function HabitChart({ user, year, month, log }: Props) {
  const habitCount = user.habits.length;
  const days = daysInMonth(year, month);

  const bars: (DayBar | null)[] = useMemo(() =>
    Array.from({ length: days }, (_, i) => {
      const d = i + 1;
      if (isFuture(year, month, d) || habitCount === 0) return null;
      const completed = user.habits.filter(
        (h) => !!log[logKey(user.id, year, month, d, h.id)]
      ).length;
      return { day: d, completed, total: habitCount, pct: completed / habitCount };
    }),
  [days, year, month, user, log, habitCount]);

  const pastBars = bars.filter(Boolean) as DayBar[];

  // Stats
  const avgPct = pastBars.length
    ? pastBars.reduce((s, b) => s + b.pct, 0) / pastBars.length
    : 0;
  const perfectDays = pastBars.filter((b) => b.pct === 1).length;
  let streak = 0;
  for (let i = pastBars.length - 1; i >= 0; i--) {
    if (pastBars[i].pct === 1) streak++;
    else break;
  }

  // 6-month history
  const history = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const offset = 5 - i;
      let m = month - offset;
      let y = year;
      while (m < 0) { m += 12; y--; }
      return {
        label: MONTH_SHORT[m],
        pct: computeMonthAvg(user, y, m, log),
        isCurrent: y === year && m === month,
      };
    });
  }, [user, year, month, log]);

  if (habitCount === 0) return null;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Monthly avg', value: `${Math.round(avgPct * 100)}%` },
          { label: 'Perfect days', value: String(perfectDays) },
          { label: 'Current streak', value: `${streak}d` },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
            <p className="text-zinc-100 text-2xl font-semibold">{s.value}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Daily completion bar chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-3">
          Daily completion — {MONTH_SHORT[month]} {year}
        </p>
        <div className="flex items-end gap-px h-16">
          {Array.from({ length: days }, (_, i) => {
            const bar = bars[i];
            if (!bar) {
              return <div key={i} className="flex-1 bg-zinc-800/40 rounded-sm" style={{ height: 3 }} />;
            }
            const color =
              bar.pct === 1
                ? 'bg-green-500'
                : bar.pct >= 0.5
                ? 'bg-amber-400'
                : bar.pct > 0
                ? 'bg-orange-500'
                : 'bg-zinc-700';
            const h = Math.max(Math.round(bar.pct * 56), bar.pct > 0 ? 4 : 3);
            return (
              <div
                key={i}
                className={cn('flex-1 rounded-sm transition-all', color)}
                style={{ height: h }}
                title={`Day ${bar.day}: ${bar.completed}/${bar.total} habits`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-zinc-700 text-[10px]">1</span>
          <span className="text-zinc-700 text-[10px]">{Math.ceil(days / 2)}</span>
          <span className="text-zinc-700 text-[10px]">{days}</span>
        </div>
      </div>

      {/* 6-month history */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-3">
          6-month history
        </p>
        <div className="flex items-end gap-2 h-16">
          {history.map((m) => {
            const color =
              m.pct >= 0.8
                ? 'bg-green-500'
                : m.pct >= 0.5
                ? 'bg-amber-400'
                : m.pct > 0
                ? 'bg-orange-500'
                : 'bg-zinc-700';
            const h = Math.max(Math.round(m.pct * 56), m.pct > 0 ? 4 : 3);
            return (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-full rounded transition-all',
                    color,
                    m.isCurrent && 'ring-1 ring-blue-400/50'
                  )}
                  style={{ height: h }}
                  title={`${m.label}: ${Math.round(m.pct * 100)}%`}
                />
                <span className={cn(
                  'text-[10px]',
                  m.isCurrent ? 'text-blue-400' : 'text-zinc-600'
                )}>
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
