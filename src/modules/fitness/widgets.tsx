'use client';

import { useEffect, useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { loadHealth, syncHealth, WORKOUT_COLORS } from '@/lib/health/store';
import type { HealthData } from '@/lib/health/store';
import type { WidgetProps } from '@/types';
import { cn } from '@/lib/utils';

const DAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function HealthFitnessWidget({ widgetInstanceId }: WidgetProps) {
  const [data, setData] = useState<HealthData | null>(null);

  useEffect(() => { setData(loadHealth()); syncHealth(setData); }, [widgetInstanceId]);

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
