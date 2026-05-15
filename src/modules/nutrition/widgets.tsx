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


// ─── NutritionDemoWidget ──────────────────────────────────────────────────────

const DEMO = {
  calories:    { val: 1840, goal: 2500, unit: 'kcal', color: 'bg-orange-500',  label: 'Calories'    },
  protein_g:   { val: 142,  goal: 180,  unit: 'g',    color: 'bg-red-500',     label: 'Protein'     },
  carbs_g:     { val: 198,  goal: 250,  unit: 'g',    color: 'bg-amber-500',   label: 'Carbs'       },
  fat_g:       { val: 61,   goal: 80,   unit: 'g',    color: 'bg-yellow-500',  label: 'Fat'         },
  fiber_g:     { val: 22,   goal: 30,   unit: 'g',    color: 'bg-lime-500',    label: 'Fiber'       },
  sugar_g:     { val: 48,   goal: 50,   unit: 'g',    color: 'bg-pink-500',    label: 'Sugar'       },
  sodium_mg:   { val: 1820, goal: 2300, unit: 'mg',   color: 'bg-cyan-500',    label: 'Sodium'      },
};

const MICROS = [
  { label: 'Vitamin D', val: 14,  goal: 20,   unit: 'mcg', color: 'bg-yellow-400'  },
  { label: 'Calcium',   val: 780, goal: 1000, unit: 'mg',  color: 'bg-blue-400'    },
  { label: 'Iron',      val: 14,  goal: 18,   unit: 'mg',  color: 'bg-rose-400'    },
  { label: 'Potassium', val: 2800,goal: 3500, unit: 'mg',  color: 'bg-violet-400'  },
  { label: 'Vitamin C', val: 72,  goal: 90,   unit: 'mg',  color: 'bg-orange-400'  },
  { label: 'Magnesium', val: 290, goal: 420,  unit: 'mg',  color: 'bg-teal-400'    },
  { label: 'Zinc',      val: 9,   goal: 11,   unit: 'mg',  color: 'bg-indigo-400'  },
  { label: 'Vitamin B12',val: 2.1,goal: 2.4,  unit: 'mcg', color: 'bg-emerald-400' },
];

function MacroBar({ label, val, goal, unit, color }: { label: string; val: number; goal: number; unit: string; color: string }) {
  const pct = Math.min(100, (val / goal) * 100);
  const over = val > goal;
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-zinc-400 text-[10px]">{label}</span>
        <span className={cn('text-[10px] tabular-nums', over ? 'text-rose-400' : 'text-zinc-500')}>
          {val.toLocaleString()}/{goal.toLocaleString()}{unit}
        </span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', over ? 'bg-rose-500' : color)}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function NutritionDemoWidget(_: WidgetProps) {
  const calPct = Math.round((DEMO.calories.val / DEMO.calories.goal) * 100);

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Demo badge + calorie summary */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Flame size={12} className="text-orange-400" />
          <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Today — Demo</span>
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">DEMO DATA</span>
      </div>

      {/* Calories hero */}
      <div className="flex items-center gap-3 shrink-0 bg-zinc-800/40 rounded-xl p-3">
        <div className="relative w-14 h-14">
          <svg width="56" height="56" className="-rotate-90">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#27272a" strokeWidth="5" />
            <circle cx="28" cy="28" r="22" fill="none" stroke="#f97316"
              strokeWidth="5" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 22}
              strokeDashoffset={2 * Math.PI * 22 * (1 - calPct / 100)} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-zinc-300">{calPct}%</span>
        </div>
        <div>
          <p className="text-zinc-100 text-2xl font-bold tabular-nums leading-none">{DEMO.calories.val.toLocaleString()}</p>
          <p className="text-zinc-500 text-[10px] mt-0.5">of {DEMO.calories.goal.toLocaleString()} kcal goal</p>
          <p className="text-zinc-600 text-[9px] mt-1">{DEMO.calories.goal - DEMO.calories.val} kcal remaining</p>
        </div>
      </div>

      {/* Macros */}
      <div className="shrink-0">
        <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-2">Macronutrients</p>
        <div className="space-y-2">
          {Object.entries(DEMO).slice(1).map(([k, m]) => (
            <MacroBar key={k} {...m} />
          ))}
        </div>
      </div>

      {/* Micros */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-2">Micronutrients</p>
        <div className="space-y-2">
          {MICROS.map((m) => (
            <MacroBar key={m.label} {...m} />
          ))}
        </div>
      </div>
    </div>
  );
}
