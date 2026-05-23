'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { GlowBar } from '@/components/ui/GlowBar';
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

// ── Glowing circular ring ─────────────────────────────────────────────────────

function GlowRing({ value, goal, size = 56 }: { value: number; goal: number; size?: number }) {
  const pct = Math.min(1, value / goal);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pctNum = Math.round(pct * 100);

  const stroke = pct >= 0.8 ? '#F59E0B' : pct >= 0.5 ? '#00D4FF' : '#8B5CF6';
  const glowColor = pct >= 0.8
    ? 'rgba(245,158,11,0.65)'
    : pct >= 0.5
    ? 'rgba(0,212,255,0.65)'
    : 'rgba(139,92,246,0.55)';

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={stroke} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.58rem',
          fontWeight: '700',
          color: stroke,
          textShadow: `0 0 10px ${glowColor}`,
        }}>
          {pctNum}%
        </span>
      </div>
    </div>
  );
}

// ── Mono readout number ───────────────────────────────────────────────────────

function Readout({ value, unit, label }: { value: string | number; unit?: string; label?: string }) {
  return (
    <div>
      {label && (
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.48rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(160,175,200,0.4)',
          marginBottom: '2px',
        }}>
          {label}
        </p>
      )}
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '1.5rem',
        fontWeight: '700',
        letterSpacing: '0.04em',
        color: '#ffffff',
        textShadow: '0 0 20px rgba(0,212,255,0.18)',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && (
          <span style={{ fontSize: '0.65rem', color: 'rgba(160,175,200,0.45)', marginLeft: '3px', fontWeight: 400 }}>
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '0.5rem',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'rgba(0,212,255,0.3)',
      marginBottom: '6px',
    }}>
      {children}
    </p>
  );
}

// ─── NutritionTodayWidget ────────────────────────────────────────────────────

export function NutritionTodayWidget({ widgetInstanceId }: WidgetProps) {
  const [today, setToday] = useState<TodaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/nutrition/summary')
      .then(r => r.json())
      .then(d => { if (!d.error) setToday(d.today); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    const iv = setInterval(() => {
      fetch('/api/nutrition/summary').then(r => r.json()).then(d => { if (!d.error) setToday(d.today); });
    }, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [widgetInstanceId]);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'rgba(0,212,255,0.3)', letterSpacing: '0.12em' }}>
        LOADING…
      </div>
    </div>
  );
  if (error || !today) return (
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(160,175,200,0.35)' }}>
      Configure Supabase to enable nutrition tracking.
    </p>
  );

  const remaining = GOALS.calories - today.calories;

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <Flame size={11} style={{ color: '#F59E0B', flexShrink: 0 }} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.55rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(0,212,255,0.4)',
        }}>
          Today · {today.meal_count} meal{today.meal_count !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <GlowRing value={today.calories} goal={GOALS.calories} size={54} />
        <div className="flex flex-col gap-1">
          <Readout value={today.calories} unit="kcal" />
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.52rem',
            color: remaining > 0 ? 'rgba(0,212,255,0.45)' : 'rgba(139,92,246,0.6)',
          }}>
            {remaining > 0 ? `${remaining.toLocaleString()} remaining` : `${Math.abs(remaining).toLocaleString()} over`}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-2.5 overflow-hidden">
        <SectionLabel>Macros</SectionLabel>
        {[
          { label: 'Protein', val: today.protein_g, goal: GOALS.protein_g, unit: 'g' },
          { label: 'Carbs',   val: today.carbs_g,   goal: GOALS.carbs_g,   unit: 'g' },
          { label: 'Fat',     val: today.fat_g,     goal: GOALS.fat_g,     unit: 'g' },
        ].map(({ label, val, goal, unit }) => (
          <GlowBar key={label} value={val} goal={goal} label={label} valueLabel={`${val}${unit}/${goal}${unit}`} />
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
      .then(r => r.json())
      .then(d => { if (!d.error) { setWeek(d.week); setToday(d.today); } })
      .finally(() => setLoading(false));
  }, [widgetInstanceId]);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'rgba(0,212,255,0.3)', letterSpacing: '0.12em' }}>
        LOADING…
      </div>
    </div>
  );
  if (!week || !today) return (
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(160,175,200,0.35)' }}>
      Configure Supabase to enable nutrition tracking.
    </p>
  );

  const calDelta = today.calories - week.avg_calories;
  const proOk = today.protein_g >= GOALS.protein_g;

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <Flame size={11} style={{ color: '#F59E0B', flexShrink: 0 }} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.55rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(0,212,255,0.4)',
        }}>
          7-Day Avg · {week.days_logged}/7 days
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 shrink-0">
        {[
          { label: 'Avg Calories', value: week.avg_calories.toLocaleString(), sub: `${calDelta >= 0 ? '+' : ''}${calDelta} today`, subOk: Math.abs(calDelta) < 200 },
          { label: 'Avg Protein',  value: `${week.avg_protein_g}g`,            sub: proOk ? 'Goal hit today' : `${GOALS.protein_g - today.protein_g}g short`, subOk: proOk },
        ].map(({ label, value, sub, subOk }) => (
          <div
            key={label}
            className="rounded-lg p-2.5"
            style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.08)' }}
          >
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(160,175,200,0.4)', marginBottom: '4px' }}>
              {label}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: '700', color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {value}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: subOk ? 'rgba(52,211,153,0.8)' : 'rgba(248,113,113,0.75)', marginTop: '3px' }}>
              {sub}
            </p>
          </div>
        ))}
      </div>

      <div className="flex-1 space-y-2.5 overflow-hidden">
        <SectionLabel>Today vs Goal</SectionLabel>
        {[
          { label: 'Calories', val: today.calories,  goal: GOALS.calories,   unit: '' },
          { label: 'Protein',  val: today.protein_g, goal: GOALS.protein_g,  unit: 'g' },
        ].map(({ label, val, goal, unit }) => (
          <GlowBar key={label} value={val} goal={goal} label={label} valueLabel={`${val}${unit}/${goal}${unit}`} />
        ))}
      </div>
    </div>
  );
}

// ─── NutritionDemoWidget ─────────────────────────────────────────────────────

const DEMO_MACROS = [
  { label: 'Calories', val: 1840, goal: 2500, unit: ''   },
  { label: 'Protein',  val: 142,  goal: 180,  unit: 'g'  },
  { label: 'Carbs',    val: 198,  goal: 250,  unit: 'g'  },
  { label: 'Fat',      val: 61,   goal: 80,   unit: 'g'  },
  { label: 'Fiber',    val: 22,   goal: 30,   unit: 'g'  },
  { label: 'Sugar',    val: 48,   goal: 50,   unit: 'g'  },
  { label: 'Sodium',   val: 1820, goal: 2300, unit: 'mg' },
];

const DEMO_MICROS = [
  { label: 'Vitamin D',   val: 14,   goal: 20,   unit: 'mcg' },
  { label: 'Calcium',     val: 780,  goal: 1000, unit: 'mg'  },
  { label: 'Iron',        val: 14,   goal: 18,   unit: 'mg'  },
  { label: 'Potassium',   val: 2800, goal: 3500, unit: 'mg'  },
  { label: 'Vitamin C',   val: 72,   goal: 90,   unit: 'mg'  },
  { label: 'Magnesium',   val: 290,  goal: 420,  unit: 'mg'  },
  { label: 'Zinc',        val: 9,    goal: 11,   unit: 'mg'  },
  { label: 'Vitamin B12', val: 2.1,  goal: 2.4,  unit: 'mcg' },
];

export function NutritionDemoWidget(_: WidgetProps) {
  const cal = DEMO_MACROS[0];

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Flame size={11} style={{ color: '#F59E0B', flexShrink: 0 }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.55rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(0,212,255,0.4)',
          }}>
            Today — Demo
          </span>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.48rem',
          letterSpacing: '0.1em',
          color: 'rgba(245,158,11,0.5)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '4px',
          padding: '1px 6px',
        }}>
          DEMO
        </span>
      </div>

      <div
        className="flex items-center gap-3 shrink-0 rounded-xl p-3"
        style={{ background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.08)' }}
      >
        <GlowRing value={cal.val} goal={cal.goal} size={56} />
        <div className="flex flex-col gap-1.5">
          <Readout value={cal.val} unit="kcal" label="Today" />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'rgba(0,212,255,0.4)' }}>
            {(cal.goal - cal.val).toLocaleString()} kcal remaining
          </p>
        </div>
      </div>

      <div className="shrink-0 space-y-2">
        <SectionLabel>Macronutrients</SectionLabel>
        {DEMO_MACROS.slice(1).map(({ label, val, goal, unit }) => (
          <GlowBar key={label} value={val} goal={goal} label={label} valueLabel={`${val}${unit}/${goal}${unit}`} />
        ))}
      </div>

      {/* Micronutrients — biological systems grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <SectionLabel>Micronutrients</SectionLabel>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {DEMO_MICROS.map(({ label, val, goal, unit }) => (
            <GlowBar key={label} value={val} goal={goal} label={label} valueLabel={`${val}${unit}`} height={3} />
          ))}
        </div>
      </div>
    </div>
  );
}
