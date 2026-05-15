'use client';

import { useEffect, useState } from 'react';
import { Flame, Beef, Wheat, Droplets, TrendingUp, Clock, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Summary {
  today: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    meal_count: number;
  };
  week: {
    avg_calories: number;
    avg_protein_g: number;
    days_logged: number;
  };
  recent: Array<{
    id: string;
    logged_at: string;
    meal_type: string;
    description: string;
    total_calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    source: string;
    nutrition_log_items: Array<{ name: string; quantity: string; calories: number }>;
  }>;
}

// Calorie / macro goal defaults (user can adjust in the future)
const GOALS = { calories: 2500, protein_g: 180, carbs_g: 250, fat_g: 80 };

function MacroBar({ label, value, goal, color, unit = 'g' }: {
  label: string; value: number; goal: number; color: string; unit?: string;
}) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-zinc-400 text-xs">{label}</span>
        <span className="text-zinc-300 text-xs tabular-nums font-medium">
          {value}{unit} <span className="text-zinc-600">/ {goal}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <span className="text-zinc-500 text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-zinc-100 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-zinc-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

const MEAL_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-500/20 text-amber-300',
  lunch:     'bg-blue-500/20 text-blue-300',
  dinner:    'bg-violet-500/20 text-violet-300',
  snack:     'bg-emerald-500/20 text-emerald-300',
  unknown:   'bg-zinc-700 text-zinc-400',
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NutritionPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/nutrition/summary')
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setSummary(d); })
      .catch(() => setError('Failed to load nutrition data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-zinc-800 rounded-xl" />)}
        </div>
        <div className="h-48 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center gap-3">
        <UtensilsCrossed size={32} className="text-zinc-600" />
        <p className="text-zinc-400 text-sm">{error}</p>
        <p className="text-zinc-600 text-xs">Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured.</p>
      </div>
    );
  }

  if (!summary) return null;
  const { today, week, recent } = summary;
  const calPct = Math.min(100, Math.round((today.calories / GOALS.calories) * 100));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <UtensilsCrossed size={16} className="text-orange-400" />
          <h1 className="text-zinc-100 font-semibold">Nutrition</h1>
        </div>
        <span className="text-zinc-600 text-xs">{today.meal_count} meal{today.meal_count !== 1 ? 's' : ''} logged today</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Today stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Flame}   label="Calories"  value={today.calories.toLocaleString()}
            sub={`${calPct}% of ${GOALS.calories.toLocaleString()} goal`} color="text-orange-400" />
          <StatCard icon={Beef}    label="Protein"   value={`${today.protein_g}g`}
            sub={`Goal: ${GOALS.protein_g}g`} color="text-red-400" />
          <StatCard icon={Wheat}   label="Carbs"     value={`${today.carbs_g}g`}
            sub={`Goal: ${GOALS.carbs_g}g`} color="text-amber-400" />
          <StatCard icon={Droplets} label="Fat"      value={`${today.fat_g}g`}
            sub={`Goal: ${GOALS.fat_g}g`} color="text-blue-400" />
        </div>

        {/* Macro progress bars */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-1">Today&apos;s Macros</p>
          <MacroBar label="Calories" value={today.calories} goal={GOALS.calories} color="bg-orange-500" unit="" />
          <MacroBar label="Protein"  value={today.protein_g} goal={GOALS.protein_g} color="bg-red-500" />
          <MacroBar label="Carbs"    value={today.carbs_g}   goal={GOALS.carbs_g}   color="bg-amber-500" />
          <MacroBar label="Fat"      value={today.fat_g}     goal={GOALS.fat_g}     color="bg-blue-500" />
        </div>

        {/* 7-day averages */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={13} className="text-zinc-500" />
              <span className="text-zinc-500 text-xs uppercase tracking-wider">7-day avg calories</span>
            </div>
            <p className="text-zinc-100 text-xl font-bold tabular-nums">{week.avg_calories.toLocaleString()}</p>
            <p className="text-zinc-600 text-xs mt-0.5">{week.days_logged}/7 days logged</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Beef size={13} className="text-zinc-500" />
              <span className="text-zinc-500 text-xs uppercase tracking-wider">7-day avg protein</span>
            </div>
            <p className="text-zinc-100 text-xl font-bold tabular-nums">{week.avg_protein_g}g</p>
            <p className="text-zinc-600 text-xs mt-0.5">daily average</p>
          </div>
        </div>

        {/* Recent meals */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <Clock size={13} className="text-zinc-500" />
            <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Recent Meals</span>
          </div>

          {recent.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-600 text-sm">
              No meals logged yet. Use the ChatGPT Action to log your first meal.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {recent.map((meal) => (
                <div key={meal.id}>
                  <button
                    onClick={() => setExpandedId(expandedId === meal.id ? null : meal.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors text-left"
                  >
                    {/* Meal type badge */}
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium capitalize shrink-0',
                      MEAL_COLORS[meal.meal_type] ?? MEAL_COLORS.unknown)}>
                      {meal.meal_type}
                    </span>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 text-sm truncate">{meal.description || 'Meal'}</p>
                      <p className="text-zinc-600 text-[10px]">
                        {fmtDate(meal.logged_at)} · {fmtTime(meal.logged_at)}
                      </p>
                    </div>

                    {/* Macros */}
                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <p className="text-zinc-200 text-sm font-semibold tabular-nums">
                          {Math.round(meal.total_calories ?? 0)}
                        </p>
                        <p className="text-zinc-600 text-[9px]">kcal</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-zinc-400 text-xs tabular-nums">{Math.round(meal.protein_g ?? 0)}g P</p>
                        <p className="text-zinc-600 text-[9px]">{Math.round(meal.carbs_g ?? 0)}g C · {Math.round(meal.fat_g ?? 0)}g F</p>
                      </div>
                    </div>
                  </button>

                  {/* Expanded items */}
                  {expandedId === meal.id && meal.nutrition_log_items?.length > 0 && (
                    <div className="px-4 pb-3 bg-zinc-950/40">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-0.5 pt-1">
                        <span className="text-zinc-600 text-[9px] uppercase tracking-wider">Item</span>
                        <span className="text-zinc-600 text-[9px] uppercase tracking-wider text-right">Qty</span>
                        <span className="text-zinc-600 text-[9px] uppercase tracking-wider text-right">kcal</span>
                        {meal.nutrition_log_items.map((item, i) => (
                          <>
                            <span key={`n${i}`} className="text-zinc-300 text-xs">{item.name}</span>
                            <span key={`q${i}`} className="text-zinc-500 text-xs text-right">{item.quantity ?? '—'}</span>
                            <span key={`c${i}`} className="text-zinc-400 text-xs text-right tabular-nums">{Math.round(item.calories ?? 0)}</span>
                          </>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
