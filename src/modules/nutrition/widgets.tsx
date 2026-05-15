'use client';

import { useEffect, useState } from 'react';
import { Flame, Beef, Wheat, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetProps } from '@/types';

interface TodaySummary {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_count: number;
}

interface WeekSummary {
  avg_calories: number;
  avg_protein_g: number;
  days_logged: number;
}

const GOALS = { calories: 2500, protein_g: 180, carbs_g: 250, fat_g: 80 };

function Ring({ value, goal, color, size = 48 }: { value: number; goal: number; color: string; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, value / goal);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#27272a" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={5} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} />
    </svg>
  );
}

// ─── NutritionTodayWidget ────────────────────────────────────────────────────

export function NutritionTodayWidget({ widgetInstanceId }: WidgetProps) {
  const [today, setToday] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/nutrition/summary')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setToday(d.today); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      fetch('/api/nutrition/summary').then((r) => r.json()).then((d) => { if (!d.error) setToday(d.today); });
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [widgetInstanceId]);

  if (loading) return <div className="h-full flex items-center justify-center"><div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" /></div>;
  if (error || !today) return <p className="text-zinc-600 text-xs">Configure Supabase to enable nutrition tracking.</p>;

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <Flame size={12} className="text-orange-400 shrink-0" />
        <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Today</span>
        <span className="text-zinc-600 text-[10px]">{today.meal_count} meal{today.meal_count !== 1 ? 's' : ''}</span>
      </div>

      {/* Calories big number */}
      <div className="flex items-center gap-3 shrink-0">
        <Ring value={today.calories} goal={GOALS.calories} color="#f97316" size={52} />
        <div>
          <p className="text-zinc-100 text-xl font-bold tabular-nums leading-none">{today.calories.toLocaleString()}</p>
          <p className="text-zinc-600 text-[10px] mt-0.5">of {GOALS.calories.toLocaleString()} kcal</p>
        </div>
      </div>

      {/* Macro mini rows */}
      <div className="space-y-1.5 flex-1 overflow-hidden">
        {[
          { icon: Beef,     label: 'Protein', val: today.protein_g, goal: GOALS.protein_g, color: 'bg-red-500'   },
          { icon: Wheat,    label: 'Carbs',   val: today.carbs_g,   goal: GOALS.carbs_g,   color: 'bg-amber-500' },
          { icon: Droplets, label: 'Fat',     val: today.fat_g,     goal: GOALS.fat_g,     color: 'bg-blue-500'  },
        ].map(({ icon: Icon, label, val, goal, color }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5">
                <Icon size={10} className="text-zinc-600" />
                <span className="text-zinc-500 text-[10px]">{label}</span>
              </div>
              <span className="text-zinc-400 text-[10px] tabular-nums">{val}g</span>
            </div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', color)}
                style={{ width: `${Math.min(100, (val / goal) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NutritionWeekWidget ─────────────────────────────────────────────────────

export function NutritionWeekWidget({ widgetInstanceId }: WidgetProps) {
  const [week, setWeek] = useState<WeekSummary | null>(null);
  const [today, setToday] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/nutrition/summary')
      .then((r) => r.json())
      .then((d) => { if (!d.error) { setWeek(d.week); setToday(d.today); } })
      .finally(() => setLoading(false));
  }, [widgetInstanceId]);

  if (loading) return <div className="h-full flex items-center justify-center"><div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" /></div>;
  if (!week || !today) return <p className="text-zinc-600 text-xs">Configure Supabase to enable nutrition tracking.</p>;

  const calDiff = today.calories - week.avg_calories;
  const proOk = today.protein_g >= GOALS.protein_g;

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <Flame size={12} className="text-orange-400 shrink-0" />
        <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">7-Day Avg</span>
        <span className="text-zinc-600 text-[10px]">{week.days_logged}/7 days</span>
      </div>

      <div className="grid grid-cols-2 gap-2 shrink-0">
        <div className="bg-zinc-800/60 rounded-lg p-2.5">
          <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-1">Avg Calories</p>
          <p className="text-zinc-100 text-lg font-bold tabular-nums">{week.avg_calories.toLocaleString()}</p>
          <p className={cn('text-[9px] tabular-nums', calDiff >= 0 ? 'text-rose-400' : 'text-emerald-400')}>
            {calDiff >= 0 ? '+' : ''}{calDiff} today
          </p>
        </div>
        <div className="bg-zinc-800/60 rounded-lg p-2.5">
          <p className="text-zinc-500 text-[9px] uppercase tracking-wider mb-1">Avg Protein</p>
          <p className="text-zinc-100 text-lg font-bold tabular-nums">{week.avg_protein_g}g</p>
          <p className={cn('text-[9px]', proOk ? 'text-emerald-400' : 'text-zinc-600')}>
            {proOk ? `Goal hit today` : `${GOALS.protein_g - today.protein_g}g short today`}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-hidden">
        <p className="text-zinc-600 text-[9px] uppercase tracking-wider">Today vs goal</p>
        {[
          { label: 'Calories', val: today.calories, goal: GOALS.calories, color: 'bg-orange-500', unit: '' },
          { label: 'Protein',  val: today.protein_g, goal: GOALS.protein_g, color: 'bg-red-500',    unit: 'g' },
        ].map(({ label, val, goal, color, unit }) => (
          <div key={label}>
            <div className="flex justify-between text-[9px] mb-0.5">
              <span className="text-zinc-500">{label}</span>
              <span className="text-zinc-500 tabular-nums">{val}{unit}/{goal}{unit}</span>
            </div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min(100, (val/goal)*100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
