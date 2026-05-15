'use client';

import { useEffect, useState, useCallback } from 'react';
import { Target, CheckCircle2, Circle, Flame, BarChart2, CalendarDays } from 'lucide-react';
import { loadData, saveData, logKey } from '@/lib/habit-tracker/store';
import { currentStreak, bestStreak, recentDays, monthDays } from '@/lib/habit-tracker/analytics';
import type { HabitUser, HabitTrackerData } from '@/lib/habit-tracker/store';
import type { WidgetProps, WidgetSettingsProps } from '@/types';
import { cn } from '@/lib/utils';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function todayKey() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

function UserSettings({ config, onConfigChange }: WidgetSettingsProps) {
  const [users, setUsers] = useState<HabitUser[]>([]);
  useEffect(() => { setUsers(loadData().users); }, []);
  const selectedUserId = config.userId as string | undefined;
  return (
    <div>
      <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1.5">Show habits for</label>
      <div className="flex flex-wrap gap-1.5">
        {users.map((u) => (
          <button key={u.id} onClick={() => onConfigChange({ ...config, userId: u.id })}
            className={cn('px-2.5 py-1 rounded text-xs transition-colors',
              selectedUserId === u.id ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200')}>
            {u.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── HabitTodayWidget ─────────────────────────────────────────────────────────

export function HabitTodaySettings(props: WidgetSettingsProps) { return <UserSettings {...props} />; }

export function HabitTodayWidget({ widgetInstanceId, config }: WidgetProps) {
  const [user, setUser] = useState<HabitUser | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const userId = config.userId as string | undefined;

  const reload = useCallback(() => {
    const data = loadData();
    const { year, month, day } = todayKey();
    const u = userId ? data.users.find((u) => u.id === userId) : data.users[0];
    setUser(u ?? null);
    if (u) {
      setChecked(new Set(u.habits.filter((h) => data.log[logKey(u.id, year, month, day, h.id)]).map((h) => h.id)));
    }
  }, [userId]);

  useEffect(() => { reload(); }, [reload, widgetInstanceId]);

  const toggle = useCallback((habitId: string) => {
    const data = loadData();
    const { year, month, day } = todayKey();
    if (!user) return;
    const k = logKey(user.id, year, month, day, habitId);
    data.log[k] = !data.log[k];
    saveData(data);
    setChecked((prev) => { const n = new Set(prev); data.log[k] ? n.add(habitId) : n.delete(habitId); return n; });
  }, [user]);

  const doneCount = user?.habits.filter((h) => checked.has(h.id)).length ?? 0;
  const total = user?.habits.length ?? 0;
  const dayLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Target size={12} className="text-emerald-400 shrink-0" />
          <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Habits</span>
          {user && <span className="text-zinc-600 text-[10px]">— {user.name}</span>}
        </div>
        {total > 0 && (
          <span className={cn('text-[10px] font-semibold tabular-nums', doneCount === total ? 'text-emerald-400' : 'text-zinc-500')}>
            {doneCount}/{total}
          </span>
        )}
      </div>
      <p className="text-zinc-600 text-[10px] shrink-0 -mt-1">{dayLabel}</p>
      {total > 0 && (
        <div className="h-1 bg-zinc-800 rounded-full shrink-0 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(doneCount / total) * 100}%` }} />
        </div>
      )}
      {!user ? (
        <p className="text-zinc-600 text-xs">Open settings to select a user</p>
      ) : user.habits.length === 0 ? (
        <p className="text-zinc-600 text-xs">No habits configured</p>
      ) : (
        <ul className="space-y-1 overflow-y-auto flex-1">
          {user.habits.map((habit) => {
            const done = checked.has(habit.id);
            return (
              <li key={habit.id}>
                <button onClick={() => toggle(habit.id)}
                  className={cn('w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-xs transition-all text-left',
                    done ? 'bg-emerald-500/10' : 'bg-zinc-800/60 hover:bg-zinc-800')}>
                  {done ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" /> : <Circle size={13} className="text-zinc-600 shrink-0" />}
                  <span className={cn('leading-snug flex-1', done ? 'text-zinc-400 line-through' : 'text-zinc-200')}>{habit.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── HabitAnalyticsWidget ─────────────────────────────────────────────────────

type AnalyticsView = 'streaks' | 'weekly' | 'monthly';

export function HabitAnalyticsSettings({ config, onConfigChange }: WidgetSettingsProps) {
  const [users, setUsers] = useState<HabitUser[]>([]);
  useEffect(() => { setUsers(loadData().users); }, []);
  const userId = config.userId as string | undefined;
  const view = (config.view as AnalyticsView | undefined) ?? 'streaks';

  return (
    <div className="space-y-3">
      <div>
        <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1.5">View</label>
        <div className="flex gap-1.5">
          {(['streaks', 'weekly', 'monthly'] as AnalyticsView[]).map((v) => (
            <button key={v} onClick={() => onConfigChange({ ...config, view: v })}
              className={cn('px-2.5 py-1 rounded text-xs capitalize transition-colors',
                view === v ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200')}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1.5">Person</label>
        <div className="flex flex-wrap gap-1.5">
          {users.map((u) => (
            <button key={u.id} onClick={() => onConfigChange({ ...config, userId: u.id })}
              className={cn('px-2.5 py-1 rounded text-xs transition-colors',
                userId === u.id ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200')}>
              {u.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// — Streaks view —
function StreaksView({ data, userId }: { data: HabitTrackerData; userId: string }) {
  const user = data.users.find((u) => u.id === userId);
  if (!user || user.habits.length === 0) return <p className="text-zinc-600 text-xs">No habits to show</p>;

  return (
    <ul className="space-y-2 overflow-y-auto flex-1">
      {user.habits.map((habit) => {
        const cur = currentStreak(data, userId, habit.id);
        const best = bestStreak(data, userId, habit.id);
        const dots = recentDays(data, userId, habit.id, 7);
        return (
          <li key={habit.id} className="bg-zinc-800/50 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-zinc-200 text-xs font-medium truncate flex-1">{habit.name}</span>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-zinc-500 text-[10px]">best {best}</span>
                <div className="flex items-center gap-0.5">
                  <Flame size={11} className={cn(cur > 0 ? 'text-orange-400' : 'text-zinc-700')} />
                  <span className={cn('text-xs font-semibold tabular-nums', cur > 0 ? 'text-orange-300' : 'text-zinc-600')}>
                    {cur}
                  </span>
                </div>
              </div>
            </div>
            {/* 7-day mini dots */}
            <div className="flex gap-1">
              {dots.map(({ date, done }, i) => (
                <div key={i} title={date.toLocaleDateString()}
                  className={cn('flex-1 h-1.5 rounded-full transition-colors', done ? 'bg-emerald-500' : 'bg-zinc-700')} />
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// — Weekly view —
function WeeklyView({ data, userId }: { data: HabitTrackerData; userId: string }) {
  const user = data.users.find((u) => u.id === userId);
  if (!user || user.habits.length === 0) return <p className="text-zinc-600 text-xs">No habits to show</p>;

  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - 6 + i); return d;
  });

  return (
    <div className="overflow-y-auto flex-1">
      {/* Header */}
      <div className="flex items-center mb-2">
        <div className="w-24 shrink-0" />
        {weekDays.map((d, i) => (
          <div key={i} className={cn('flex-1 text-center text-[9px]', d.toDateString() === today.toDateString() ? 'text-blue-400' : 'text-zinc-600')}>
            {DAY_LABELS[d.getDay()]}
          </div>
        ))}
        <div className="w-8 shrink-0 text-right text-[9px] text-zinc-600">%</div>
      </div>
      {/* Rows */}
      {user.habits.map((habit) => {
        const dots = recentDays(data, userId, habit.id, 7);
        const rate = Math.round(dots.filter((d) => d.done).length / 7 * 100);
        return (
          <div key={habit.id} className="flex items-center mb-1.5">
            <div className="w-24 shrink-0 text-zinc-300 text-[10px] truncate pr-2">{habit.name}</div>
            {dots.map(({ done }, i) => (
              <div key={i} className="flex-1 flex justify-center">
                <div className={cn('w-4 h-4 rounded-full', done ? 'bg-emerald-500' : 'bg-zinc-800')} />
              </div>
            ))}
            <div className="w-8 shrink-0 text-right text-[10px] text-zinc-500">{rate}</div>
          </div>
        );
      })}
    </div>
  );
}

// — Monthly view —
function MonthlyView({ data, userId }: { data: HabitTrackerData; userId: string }) {
  const user = data.users.find((u) => u.id === userId);
  if (!user || user.habits.length === 0) return <p className="text-zinc-600 text-xs">No habits to show</p>;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysCount = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  return (
    <div className="overflow-y-auto flex-1 space-y-3">
      {user.habits.map((habit) => {
        const days = monthDays(data, userId, habit.id, year, month);
        const done = days.filter(Boolean).length;
        return (
          <div key={habit.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-zinc-300 text-[10px] font-medium truncate">{habit.name}</span>
              <span className="text-zinc-500 text-[9px] shrink-0 ml-2">{done}/{today} days</span>
            </div>
            <div className="flex flex-wrap gap-0.5">
              {days.map((done, i) => {
                const dayNum = i + 1;
                const isFuture = dayNum > today;
                return (
                  <div key={i}
                    title={`${month + 1}/${dayNum}`}
                    className={cn(
                      'w-3.5 h-3.5 rounded-sm',
                      isFuture ? 'bg-zinc-800/30' : done ? 'bg-emerald-500' : 'bg-zinc-800'
                    )}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HabitAnalyticsWidget({ widgetInstanceId, config }: WidgetProps) {
  const [data, setData] = useState<HabitTrackerData | null>(null);
  const userId = (config.userId as string | undefined) ?? '';
  const view = (config.view as AnalyticsView | undefined) ?? 'streaks';

  useEffect(() => {
    const d = loadData();
    setData(d);
    // Default userId to first user if not set
    if (!userId && d.users[0]) {
      // handled in render fallback
    }
  }, [widgetInstanceId, userId]);

  const viewIcons = { streaks: Flame, weekly: BarChart2, monthly: CalendarDays };
  const Icon = viewIcons[view];

  const effectiveUserId = userId || (data?.users[0]?.id ?? '');
  const userName = data?.users.find((u) => u.id === effectiveUserId)?.name ?? '';

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <Icon size={12} className="text-emerald-400 shrink-0" />
        <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
          Habit {view.charAt(0).toUpperCase() + view.slice(1)}
        </span>
        {userName && <span className="text-zinc-600 text-[10px]">— {userName}</span>}
      </div>

      {!data ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-zinc-800 rounded animate-pulse" />)}
        </div>
      ) : view === 'streaks' ? (
        <StreaksView data={data} userId={effectiveUserId} />
      ) : view === 'weekly' ? (
        <WeeklyView data={data} userId={effectiveUserId} />
      ) : (
        <MonthlyView data={data} userId={effectiveUserId} />
      )}
    </div>
  );
}
