'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadHealth, saveHealth, supLogKey } from '@/lib/health/store';
import type { WidgetProps } from '@/types';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

// ─── Supplement Analytics Widget ─────────────────────────────────────────────

export function SupplementAnalyticsWidget(_: WidgetProps) {
  const [data, setData] = useState(() => loadHealth());
  const today = new Date();

  const reload = useCallback(() => setData(loadHealth()), []);
  useEffect(() => { reload(); }, [reload]);

  const active = data.supplements.filter((s) => s.active);

  // Build last 14 days
  const days14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));

  // Per-day adherence percentage
  const dayPct = days14.map((d) => {
    if (active.length === 0) return null;
    const dk = dateKey(d);
    const taken = active.filter((s) => data.supplementLog[`${dk}|${s.id}`]).length;
    return taken / active.length;
  });

  // Today's taken / total
  const todayKey = dateKey(today);
  const takenToday = active.filter((s) => data.supplementLog[`${todayKey}|${s.id}`]).length;

  // Streak: consecutive days with 100% adherence going backwards from yesterday
  let streak = 0;
  for (let i = 12; i >= 0; i--) {
    const pct = dayPct[i];
    if (pct === null || pct < 1) break;
    streak++;
  }

  // 7-day average adherence
  const last7 = dayPct.slice(7).slice(0, 7);
  const avg7 = last7.filter((p) => p !== null).reduce((a, b) => a + (b ?? 0), 0) / Math.max(1, last7.filter(p => p !== null).length);

  function toggleSupplement(id: string) {
    const key = supLogKey(today, id);
    const updated = {
      ...data,
      supplementLog: { ...data.supplementLog, [key]: !data.supplementLog[key] },
    };
    setData(updated);
    saveHealth(updated);
  }

  if (active.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-600 text-xs text-center px-4">
        No active supplements. Add some in the Supplements page.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <div className="bg-zinc-800/60 rounded-lg p-2 text-center">
          <p className="text-zinc-100 text-lg font-bold tabular-nums">{takenToday}/{active.length}</p>
          <p className="text-zinc-500 text-[9px] uppercase tracking-wider mt-0.5">Today</p>
        </div>
        <div className="bg-zinc-800/60 rounded-lg p-2 text-center">
          <p className="text-zinc-100 text-lg font-bold tabular-nums flex items-center justify-center gap-1">
            {streak} <Flame size={12} className="text-orange-400" />
          </p>
          <p className="text-zinc-500 text-[9px] uppercase tracking-wider mt-0.5">Streak</p>
        </div>
        <div className="bg-zinc-800/60 rounded-lg p-2 text-center">
          <p className="text-zinc-100 text-lg font-bold tabular-nums">{Math.round(avg7 * 100)}%</p>
          <p className="text-zinc-500 text-[9px] uppercase tracking-wider mt-0.5">7-day avg</p>
        </div>
      </div>

      {/* 14-day heatmap */}
      <div className="shrink-0">
        <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5">14-day adherence</p>
        <div className="grid grid-cols-14 gap-0.5" style={{ gridTemplateColumns: 'repeat(14, 1fr)' }}>
          {days14.map((d, i) => {
            const pct = dayPct[i];
            const isToday = dateKey(d) === todayKey;
            return (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div className={cn(
                  'w-full aspect-square rounded-sm',
                  pct === null ? 'bg-zinc-800' :
                  pct === 0    ? 'bg-zinc-800' :
                  pct < 0.5    ? 'bg-emerald-900/60' :
                  pct < 1      ? 'bg-emerald-700/70' :
                                 'bg-emerald-500',
                  isToday && 'ring-1 ring-blue-400'
                )} title={`${dateKey(d)}: ${pct !== null ? Math.round(pct*100)+'%' : 'no data'}`} />
                <span className="text-zinc-700 text-[7px] leading-none">{DAYS[d.getDay()]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today checklist */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <p className="text-zinc-600 text-[9px] uppercase tracking-wider mb-1.5 shrink-0">Today's checklist</p>
        <div className="space-y-1">
          {active.map((s) => {
            const taken = !!data.supplementLog[`${todayKey}|${s.id}`];
            return (
              <button
                key={s.id}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => toggleSupplement(s.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors',
                  taken ? 'bg-emerald-900/30 border border-emerald-800/50' : 'bg-zinc-800/60 border border-zinc-700/50'
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors',
                  taken ? 'bg-emerald-500' : 'bg-zinc-700'
                )}>
                  {taken && <Check size={10} className="text-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-xs truncate', taken ? 'text-zinc-400 line-through' : 'text-zinc-200')}>{s.name}</p>
                  {s.dosage && <p className="text-zinc-600 text-[9px]">{s.dosage}</p>}
                </div>
                {s.times.length > 0 && (
                  <span className="text-zinc-600 text-[9px] shrink-0">{s.times[0]}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
