'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Pencil, Check, X, Pill, Dumbbell } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import {
  loadHealth, saveHealth, syncHealth,
  type HealthData, type Supplement, type DaySchedule, type Exercise, type WorkoutType,
  WORKOUT_COLORS,
} from '@/lib/health/store';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WORKOUT_TYPES: WorkoutType[] = ['push', 'pull', 'legs', 'rest', 'cardio', 'other'];
const TIME_PRESETS = ['Morning', 'Noon', 'Evening', 'Pre-Workout', 'Post-Workout', 'With Food', 'Before Bed'];
type Tab = 'supplements' | 'fitness';

// ─── Supplements Tab ──────────────────────────────────────────────────────────

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

function SupplementsTab({ data, onChange }: { data: HealthData; onChange: (d: HealthData) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const blankSupplement = (): Supplement => ({
    id: uuidv4(), name: '', dosage: '', times: [], notes: '', active: true,
  });

  function save(s: Supplement) {
    if (adding) {
      onChange({ ...data, supplements: [...data.supplements, s] });
      setAdding(false);
    } else {
      onChange({ ...data, supplements: data.supplements.map((x) => x.id === s.id ? s : x) });
      setEditingId(null);
    }
  }

  function remove(id: string) {
    onChange({ ...data, supplements: data.supplements.filter((s) => s.id !== id) });
  }

  function toggle(id: string) {
    onChange({
      ...data,
      supplements: data.supplements.map((s) => s.id === id ? { ...s, active: !s.active } : s),
    });
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-zinc-100 text-base font-semibold">Supplement Schedule</h2>
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
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggle(s.id)}
                    className={cn('w-8 h-4 rounded-full transition-colors relative', s.active ? 'bg-blue-600' : 'bg-zinc-700')}>
                    <span className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', s.active ? 'left-4.5' : 'left-0.5')} />
                  </button>
                </div>
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

// ─── Fitness Tab ──────────────────────────────────────────────────────────────

function ExerciseRow({
  ex,
  onChange,
  onDelete,
}: {
  ex: Exercise;
  onChange: (e: Exercise) => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_60px_80px_90px_auto] gap-2 items-center group">
      <input
        value={ex.name}
        onChange={(e) => onChange({ ...ex, name: e.target.value })}
        placeholder="Exercise name"
        className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-sm focus:outline-none focus:border-zinc-600 w-full"
      />
      <input
        value={ex.sets}
        onChange={(e) => onChange({ ...ex, sets: e.target.value })}
        placeholder="Sets"
        className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-sm text-center focus:outline-none focus:border-zinc-600"
      />
      <input
        value={ex.reps}
        onChange={(e) => onChange({ ...ex, reps: e.target.value })}
        placeholder="Reps"
        className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-sm text-center focus:outline-none focus:border-zinc-600"
      />
      <input
        value={ex.weight}
        onChange={(e) => onChange({ ...ex, weight: e.target.value })}
        placeholder="Weight"
        className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 text-sm text-center focus:outline-none focus:border-zinc-600"
      />
      <button onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-zinc-600 hover:text-rose-400 hover:bg-zinc-800 transition-all">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function DayEditor({
  day,
  onChange,
}: {
  day: DaySchedule;
  onChange: (d: DaySchedule) => void;
}) {
  const colors = WORKOUT_COLORS[day.type];

  function addExercise() {
    onChange({
      ...day,
      exercises: [
        ...day.exercises,
        { id: uuidv4(), name: '', sets: '', reps: '', weight: '', notes: '' },
      ],
    });
  }

  function updateExercise(ex: Exercise) {
    onChange({ ...day, exercises: day.exercises.map((e) => e.id === ex.id ? ex : e) });
  }

  function deleteExercise(id: string) {
    onChange({ ...day, exercises: day.exercises.filter((e) => e.id !== id) });
  }

  return (
    <div className={cn('rounded-xl border border-zinc-800 p-5', colors.bg)}>
      {/* Day header */}
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-zinc-100 font-semibold">{DAYS_SHORT[day.dayOfWeek]}</h3>

        {/* Type selector */}
        <div className="flex gap-1 flex-wrap">
          {WORKOUT_TYPES.map((t) => {
            const c = WORKOUT_COLORS[t];
            return (
              <button
                key={t}
                onClick={() => onChange({ ...day, type: t })}
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize transition-colors',
                  day.type === t ? c.badge : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                )}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Custom label */}
        <input
          value={day.label}
          onChange={(e) => onChange({ ...day, label: e.target.value })}
          placeholder="Label…"
          className="ml-auto bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300 text-xs focus:outline-none focus:border-zinc-600 w-28"
        />
      </div>

      {day.type === 'rest' && day.exercises.length === 0 ? (
        <p className="text-zinc-600 text-sm">Rest day — no exercises.</p>
      ) : (
        <>
          {/* Column headers */}
          {day.exercises.length > 0 && (
            <div className="grid grid-cols-[1fr_60px_80px_90px_auto] gap-2 mb-1.5 px-0.5">
              {['Exercise', 'Sets', 'Reps', 'Weight', ''].map((h) => (
                <span key={h} className="text-zinc-600 text-[10px] uppercase tracking-wider">{h}</span>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {day.exercises.map((ex) => (
              <ExerciseRow
                key={ex.id}
                ex={ex}
                onChange={updateExercise}
                onDelete={() => deleteExercise(ex.id)}
              />
            ))}
          </div>
        </>
      )}

      <button
        onClick={addExercise}
        className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Plus size={13} /> Add exercise
      </button>
    </div>
  );
}

function FitnessTab({ data, onChange }: { data: HealthData; onChange: (d: HealthData) => void }) {
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(today);

  function updateDay(updated: DaySchedule) {
    onChange({
      ...data,
      fitnessSchedule: data.fitnessSchedule.map((d) =>
        d.dayOfWeek === updated.dayOfWeek ? updated : d
      ),
    });
  }

  const currentDay = data.fitnessSchedule.find((d) => d.dayOfWeek === selectedDay)!;

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-5">
        <h2 className="text-zinc-100 text-base font-semibold">Fitness Schedule</h2>
        <p className="text-zinc-500 text-xs mt-0.5">Push / Pull / Legs split — click a day to edit</p>
      </div>

      {/* Week overview */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {data.fitnessSchedule.map((day) => {
          const colors = WORKOUT_COLORS[day.type];
          const isToday = day.dayOfWeek === today;
          const isSelected = day.dayOfWeek === selectedDay;
          return (
            <button
              key={day.dayOfWeek}
              onClick={() => setSelectedDay(day.dayOfWeek)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
                isSelected
                  ? 'border-zinc-500 bg-zinc-800'
                  : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
              )}
            >
              <span className={cn('text-[11px] font-medium', isToday ? 'text-blue-400' : 'text-zinc-500')}>
                {DAYS_SHORT[day.dayOfWeek]}
              </span>
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium capitalize', colors.badge)}>
                {day.label || day.type}
              </span>
              <span className="text-zinc-600 text-[9px]">{day.exercises.length} ex.</span>
            </button>
          );
        })}
      </div>

      {/* Selected day editor */}
      <DayEditor day={currentDay} onChange={updateDay} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [tab, setTab] = useState<Tab>('supplements');

  useEffect(() => { setData(loadHealth()); syncHealth(setData); }, []);

  const handleChange = useCallback((updated: HealthData) => {
    setData(updated);
    saveHealth(updated);
  }, []);

  if (!data) {
    return <div className="p-6 text-zinc-600 text-sm">Loading…</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1 px-6 pt-5 pb-0 border-b border-zinc-800 shrink-0">
        <button
          onClick={() => setTab('supplements')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            tab === 'supplements'
              ? 'border-blue-500 text-zinc-100'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          )}
        >
          <Pill size={14} /> Supplements
        </button>
        <button
          onClick={() => setTab('fitness')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            tab === 'fitness'
              ? 'border-blue-500 text-zinc-100'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          )}
        >
          <Dumbbell size={14} /> Fitness
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'supplements' ? (
          <SupplementsTab data={data} onChange={handleChange} />
        ) : (
          <FitnessTab data={data} onChange={handleChange} />
        )}
      </div>
    </div>
  );
}
