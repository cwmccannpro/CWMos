'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, Check, X, Pill } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import {
  loadHealth, saveHealth, syncHealth,
  type HealthData, type Supplement,
} from '@/lib/health/store';

const TIME_PRESETS = ['Morning', 'Noon', 'Evening', 'Pre-Workout', 'Post-Workout', 'With Food', 'Before Bed'];

function SupplementForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Supplement;
  onSave: (s: Supplement) => void;
  onCancel: () => void;
}) {
  const [s, setS] = useState(initial);
  const [timeInput, setTimeInput] = useState('');

  function addTime(t: string) {
    const trimmed = t.trim();
    if (!trimmed || s.times.includes(trimmed)) return;
    setS((p) => ({ ...p, times: [...p.times, trimmed] }));
    setTimeInput('');
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">Name</label>
          <input
            autoFocus
            value={s.name}
            onChange={(e) => setS((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Creatine"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">Dosage</label>
          <input
            value={s.dosage}
            onChange={(e) => setS((p) => ({ ...p, dosage: e.target.value }))}
            placeholder="e.g. 5g, 2 caps"
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-sm focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      <div>
        <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">Times</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {s.times.map((t) => (
            <span key={t} className="flex items-center gap-1 bg-zinc-700 text-zinc-200 text-xs px-2 py-0.5 rounded-full">
              {t}
              <button onClick={() => setS((p) => ({ ...p, times: p.times.filter((x) => x !== t) }))}
                className="text-zinc-400 hover:text-zinc-200">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TIME_PRESETS.filter((p) => !s.times.includes(p)).map((p) => (
            <button key={p} onClick={() => addTime(p)}
              className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors">
              + {p}
            </button>
          ))}
          <input
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTime(timeInput); }}
            placeholder="Custom…"
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 w-24"
          />
        </div>
      </div>

      <div>
        <label className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">Notes</label>
        <input
          value={s.notes}
          onChange={(e) => setS((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Optional notes…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-sm focus:outline-none focus:border-zinc-500"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(s)}
          disabled={!s.name.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 disabled:opacity-40 transition-colors">
          <Check size={12} /> Save
        </button>
        <button onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs hover:text-zinc-200 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function SupplementsPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => { setData(loadHealth()); syncHealth(setData); }, []);

  const handleChange = useCallback((updated: HealthData) => {
    setData(updated);
    saveHealth(updated);
  }, []);

  if (!data) return <div className="p-6 text-zinc-600 text-sm">Loading…</div>;

  const blankSupplement = (): Supplement => ({
    id: uuidv4(), name: '', dosage: '', times: [], notes: '', active: true,
  });

  function save(s: Supplement) {
    if (!data) return;
    if (adding) {
      handleChange({ ...data, supplements: [...data.supplements, s] });
      setAdding(false);
    } else {
      handleChange({ ...data, supplements: data.supplements.map((x) => x.id === s.id ? s : x) });
      setEditingId(null);
    }
  }

  function remove(id: string) {
    if (!data) return;
    handleChange({ ...data, supplements: data.supplements.filter((s) => s.id !== id) });
  }

  function toggle(id: string) {
    if (!data) return;
    handleChange({
      ...data,
      supplements: data.supplements.map((s) => s.id === id ? { ...s, active: !s.active } : s),
    });
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-zinc-100 text-lg font-semibold">Supplement Schedule</h1>
          <p className="text-zinc-500 text-xs mt-0.5">{data.supplements.filter((s) => s.active).length} active</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors">
            <Plus size={14} /> Add Supplement
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-5 bg-zinc-900 border border-zinc-700 rounded-xl p-4">
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-3">New Supplement</p>
          <SupplementForm initial={blankSupplement()} onSave={save} onCancel={() => setAdding(false)} />
        </div>
      )}

      {data.supplements.length === 0 && !adding && (
        <div className="text-center py-16 text-zinc-600">
          <Pill size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No supplements added yet.</p>
          <p className="text-xs mt-1">Click &quot;Add Supplement&quot; to start.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {data.supplements.map((s) =>
          editingId === s.id ? (
            <div key={s.id} className="bg-zinc-900 border border-blue-500/40 rounded-xl p-4 col-span-full md:col-span-2">
              <SupplementForm initial={s} onSave={save} onCancel={() => setEditingId(null)} />
            </div>
          ) : (
            <div key={s.id} className={cn(
              'bg-zinc-900 border rounded-xl p-4 flex flex-col gap-2 transition-opacity',
              s.active ? 'border-zinc-800' : 'border-zinc-800/50 opacity-50'
            )}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-zinc-100 font-semibold text-sm truncate">{s.name}</p>
                  {s.dosage && <p className="text-zinc-400 text-xs mt-0.5">{s.dosage}</p>}
                </div>
                <button onClick={() => toggle(s.id)}
                  className={cn('w-8 h-4 rounded-full transition-colors relative shrink-0', s.active ? 'bg-blue-600' : 'bg-zinc-700')}>
                  <span className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', s.active ? 'left-4.5' : 'left-0.5')} />
                </button>
              </div>

              {s.times.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {s.times.map((t) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{t}</span>
                  ))}
                </div>
              )}

              {s.notes && <p className="text-zinc-500 text-xs">{s.notes}</p>}

              <div className="flex gap-1.5 mt-auto pt-1">
                <button onClick={() => setEditingId(s.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 text-xs transition-colors">
                  <Pencil size={11} /> Edit
                </button>
                <button onClick={() => remove(s.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 text-xs transition-colors">
                  <Trash2 size={11} /> Remove
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
