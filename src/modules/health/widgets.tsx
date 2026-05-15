'use client';

import { useEffect, useState, useCallback } from 'react';
import { Pill, Dumbbell, CheckCircle2, Circle } from 'lucide-react';
import { loadHealth, saveHealth, supLogKey, WORKOUT_COLORS } from '@/lib/health/store';
import type { HealthData } from '@/lib/health/store';
import type { WidgetProps } from '@/types';
import { cn } from '@/lib/utils';

// ─── HealthSupplementWidget ───────────────────────────────────────────────────

export function HealthSupplementWidget({ widgetInstanceId }: WidgetProps) {
  const [data, setData] = useState<HealthData | null>(null);

  const reload = useCallback(() => setData(loadHealth()), []);

  useEffect(() => {
    reload();
  }, [reload, widgetInstanceId]);

  const toggle = useCallback((id: string) => {
    const d = loadHealth();
    const k = supLogKey(new Date(), id);
    d.supplementLog[k] = !d.supplementLog[k];
    saveHealth(d);
    setData({ ...d });
  }, []);

  if (!data) return <div className="h-full flex items-center justify-center"><div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" /></div>;

  const active = data.supplements.filter((s) => s.active);
  const today = new Date();
  const doneCount = active.filter((s) => data.supplementLog[supLogKey(today, s.id)]).length;

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Pill size={12} className="text-emerald-400 shrink-0" />
          <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Supplements</span>
        </div>
        {active.length > 0 && (
          <span className={cn('text-[10px] font-semibold tabular-nums', doneCount === active.length ? 'text-emerald-400' : 'text-zinc-500')}>
            {doneCount}/{active.length}
          </span>
        )}
      </div>

      {active.length > 0 && (
        <div className="h-1 bg-zinc-800 rounded-full shrink-0 overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: active.length ? `${(doneCount / active.length) * 100}%` : '0%' }} />
        </div>
      )}

      {active.length === 0 ? (
        <p className="text-zinc-600 text-xs">No active supplements — add them in Health.</p>
      ) : (
        <ul className="space-y-1 overflow-y-auto flex-1">
          {active.map((s) => {
            const done = !!data.supplementLog[supLogKey(today, s.id)];
            return (
              <li key={s.id}>
                <button
                  onClick={() => toggle(s.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-xs transition-all text-left',
                    done ? 'bg-emerald-500/10' : 'bg-zinc-800/60 hover:bg-zinc-800'
                  )}
                >
                  {done
                    ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    : <Circle size={13} className="text-zinc-600 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <span className={cn('leading-snug', done ? 'text-zinc-400 line-through' : 'text-zinc-200')}>
                      {s.name}
                    </span>
                    {s.dosage && <span className="text-zinc-600 ml-1.5">{s.dosage}</span>}
                  </div>
                  {s.times.length > 0 && (
                    <span className="text-zinc-600 text-[9px] shrink-0">{s.times[0]}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── HealthFitnessWidget ──────────────────────────────────────────────────────

const DAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function HealthFitnessWidget({ widgetInstanceId }: WidgetProps) {
  const [data, setData] = useState<HealthData | null>(null);

  useEffect(() => { setData(loadHealth()); }, [widgetInstanceId]);

  if (!data) return <div className="h-full flex items-center justify-center"><div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" /></div>;

  const today = new Date().getDay();
  const todaySchedule = data.fitnessSchedule.find((d) => d.dayOfWeek === today);
  const colors = WORKOUT_COLORS[todaySchedule?.type ?? 'rest'];

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 shrink-0">
        <Dumbbell size={12} className={cn('shrink-0', colors.text)} />
        <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Today&apos;s Workout</span>
        {todaySchedule && (
          <span className={cn('ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium capitalize', colors.badge)}>
            {todaySchedule.label || todaySchedule.type}
          </span>
        )}
      </div>

      {/* Mini week strip */}
      <div className="flex gap-1 shrink-0">
        {data.fitnessSchedule.map((day) => {
          const c = WORKOUT_COLORS[day.type];
          const isT = day.dayOfWeek === today;
          return (
            <div key={day.dayOfWeek} className={cn(
              'flex-1 flex flex-col items-center py-1 rounded text-center',
              isT ? c.bg : 'bg-zinc-800/40'
            )}>
              <span className={cn('text-[8px]', isT ? c.text : 'text-zinc-600')}>{DAY_SHORT[day.dayOfWeek]}</span>
              <span className={cn('text-[8px] font-medium capitalize', isT ? c.text : 'text-zinc-700')}>
                {(day.label || day.type).slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Exercises */}
      {!todaySchedule || todaySchedule.exercises.length === 0 ? (
        <p className="text-zinc-600 text-xs">
          {todaySchedule?.type === 'rest' ? 'Rest day — recover well.' : 'No exercises added yet.'}
        </p>
      ) : (
        <ul className="space-y-1 overflow-y-auto flex-1">
          {todaySchedule.exercises.map((ex) => (
            <li key={ex.id} className="bg-zinc-800/60 rounded px-2 py-1.5 text-xs">
              <span className="text-zinc-200 font-medium">{ex.name}</span>
              {(ex.sets || ex.reps || ex.weight) && (
                <span className="text-zinc-500 ml-2">
                  {[ex.sets && `${ex.sets}×`, ex.reps, ex.weight].filter(Boolean).join(' ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
