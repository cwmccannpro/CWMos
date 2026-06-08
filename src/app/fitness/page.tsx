'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import {
  loadHealth, saveHealth, syncHealth,
  type HealthData, type DaySchedule, type Exercise, type WorkoutType,
  WORKOUT_COLORS,
} from '@/lib/health/store';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WORKOUT_TYPES: WorkoutType[] = ['push', 'pull', 'legs', 'rest', 'cardio', 'other'];

function ExerciseRow({ ex, onChange, onDelete }: {
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

function DayEditor({ day, onChange }: { day: DaySchedule; onChange: (d: DaySchedule) => void }) {
  const colors = WORKOUT_COLORS[day.type];

  function addExercise() {
    onChange({
      ...day,
      exercises: [...day.exercises, { id: uuidv4(), name: '', sets: '', reps: '', weight: '', notes: '' }],
    });
  }

  return (
    <div className={cn('rounded-xl border border-zinc-800 p-5', colors.bg)}>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-zinc-100 font-semibold">{DAYS_SHORT[day.dayOfWeek]}</h3>
        <div className="flex gap-1 flex-wrap">
          {WORKOUT_TYPES.map((t) => {
            const c = WORKOUT_COLORS[t];
            return (
              <button key={t} onClick={() => onChange({ ...day, type: t })}
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize transition-colors',
                  day.type === t ? c.badge : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                )}>
                {t}
              </button>
            );
          })}
        </div>
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
                onChange={(e) => onChange({ ...day, exercises: day.exercises.map((x) => x.id === e.id ? e : x) })}
                onDelete={() => onChange({ ...day, exercises: day.exercises.filter((x) => x.id !== ex.id) })}
              />
            ))}
          </div>
        </>
      )}

      <button onClick={addExercise}
        className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        <Plus size={13} /> Add exercise
      </button>
    </div>
  );
}

export default function FitnessPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(today);

  useEffect(() => { setData(loadHealth()); syncHealth(setData); }, []);

  const handleChange = useCallback((updated: HealthData) => {
    setData(updated);
    saveHealth(updated);
  }, []);

  if (!data) return <div className="p-6 text-zinc-600 text-sm">Loading…</div>;

  function updateDay(updated: DaySchedule) {
    if (!data) return;
    handleChange({
      ...data,
      fitnessSchedule: data.fitnessSchedule.map((d) => d.dayOfWeek === updated.dayOfWeek ? updated : d),
    });
  }

  const currentDay = data.fitnessSchedule.find((d) => d.dayOfWeek === selectedDay)!;

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-5">
        <h1 className="text-zinc-100 text-lg font-semibold">Fitness Schedule</h1>
        <p className="text-zinc-500 text-xs mt-0.5">Push / Pull / Legs split — click a day to edit</p>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-6">
        {data.fitnessSchedule.map((day) => {
          const colors = WORKOUT_COLORS[day.type];
          const isToday = day.dayOfWeek === today;
          const isSelected = day.dayOfWeek === selectedDay;
          return (
            <button key={day.dayOfWeek} onClick={() => setSelectedDay(day.dayOfWeek)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
                isSelected ? 'border-zinc-500 bg-zinc-800' : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
              )}>
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

      <DayEditor day={currentDay} onChange={updateDay} />
    </div>
  );
}
