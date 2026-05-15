'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { HabitUser } from '@/lib/habit-tracker/store';
import { logKey, daysInMonth, isToday, isFuture } from '@/lib/habit-tracker/store';

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface Props {
  user: HabitUser;
  year: number;
  month: number;
  log: Record<string, boolean>;
  onToggle: (key: string) => void;
}

export function HabitGrid({ user, year, month, log, onToggle }: Props) {
  const days = useMemo(() => daysInMonth(year, month), [year, month]);
  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1);

  if (user.habits.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-xl">
        No habits yet — click Settings to add some.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="min-w-max p-4">
        {/* Day header */}
        <div className="flex mb-2">
          <div className="w-48 shrink-0" />
          {dayNumbers.map((d) => {
            const dow = new Date(year, month, d).getDay();
            const today = isToday(year, month, d);
            const future = isFuture(year, month, d);
            const isWeekend = dow === 0 || dow === 6;
            return (
              <div
                key={d}
                className={cn(
                  'w-8 flex flex-col items-center gap-0.5',
                  future && 'opacity-25'
                )}
              >
                <span className={cn(
                  'text-[10px] font-semibold leading-none',
                  today ? 'text-blue-400' : 'text-zinc-500'
                )}>
                  {d}
                </span>
                <span className={cn(
                  'text-[9px] leading-none',
                  isWeekend ? 'text-zinc-500' : 'text-zinc-700'
                )}>
                  {DOW[dow]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Habit rows */}
        <div className="space-y-1">
          {user.habits.map((habit) => (
            <div key={habit.id} className="flex items-center">
              <div className="w-48 shrink-0 pr-4">
                <span className="text-zinc-300 text-sm leading-none truncate block">{habit.name}</span>
              </div>

              {dayNumbers.map((d) => {
                const key = logKey(user.id, year, month, d, habit.id);
                const done = !!log[key];
                const future = isFuture(year, month, d);
                const today = isToday(year, month, d);

                return (
                  <button
                    key={d}
                    disabled={future}
                    onClick={() => onToggle(key)}
                    className={cn(
                      'w-8 h-8 rounded flex items-center justify-center transition-all duration-100',
                      future
                        ? 'opacity-10 cursor-not-allowed'
                        : done
                        ? 'bg-green-500 hover:bg-green-400'
                        : today
                        ? 'bg-zinc-700 border border-blue-500/50 hover:bg-green-500/30'
                        : 'bg-zinc-800 border border-zinc-700/50 hover:bg-green-500/20'
                    )}
                    title={
                      future
                        ? 'Future date'
                        : done
                        ? 'Done — click to unmark'
                        : 'Click to mark done'
                    }
                  >
                    {done && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4l2.5 2.5L9 1"
                          stroke="white"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
