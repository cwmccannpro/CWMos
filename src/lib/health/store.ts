export type WorkoutType = 'push' | 'pull' | 'legs' | 'rest' | 'cardio' | 'other';

export interface Supplement {
  id: string;
  name: string;
  dosage: string;
  times: string[];   // e.g. ['Morning', 'Pre-Workout']
  notes: string;
  active: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  notes: string;
}

export interface DaySchedule {
  dayOfWeek: number; // 0 = Sunday
  type: WorkoutType;
  label: string;     // e.g. "Push A", "Pull B", "Legs"
  exercises: Exercise[];
}

export interface HealthData {
  supplements: Supplement[];
  fitnessSchedule: DaySchedule[];
  /** Key: `${YYYY-MM-DD}|${supplementId}` */
  supplementLog: Record<string, boolean>;
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { dayOfWeek: 0, type: 'rest',  label: 'Rest',  exercises: [] },
  { dayOfWeek: 1, type: 'push',  label: 'Push',  exercises: [] },
  { dayOfWeek: 2, type: 'pull',  label: 'Pull',  exercises: [] },
  { dayOfWeek: 3, type: 'legs',  label: 'Legs',  exercises: [] },
  { dayOfWeek: 4, type: 'push',  label: 'Push',  exercises: [] },
  { dayOfWeek: 5, type: 'pull',  label: 'Pull',  exercises: [] },
  { dayOfWeek: 6, type: 'legs',  label: 'Legs',  exercises: [] },
];

const DEFAULT_DATA: HealthData = {
  supplements: [],
  fitnessSchedule: DEFAULT_SCHEDULE,
  supplementLog: {},
};

const STORAGE_KEY = 'cwm-health';

export function loadHealth(): HealthData {
  if (typeof window === 'undefined') return structuredClone(DEFAULT_DATA);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw) as Partial<HealthData>;
    return {
      supplements: parsed.supplements ?? [],
      supplementLog: parsed.supplementLog ?? {},
      // Merge saved schedule with defaults so new days always exist
      fitnessSchedule: DEFAULT_SCHEDULE.map((def) => {
        const saved = parsed.fitnessSchedule?.find((d) => d.dayOfWeek === def.dayOfWeek);
        return saved ?? def;
      }),
    };
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

export function saveHealth(data: HealthData): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export function supLogKey(date: Date, supplementId: string): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}|${supplementId}`;
}

export const WORKOUT_COLORS: Record<WorkoutType, { bg: string; text: string; badge: string }> = {
  push:   { bg: 'bg-amber-600/15',   text: 'text-amber-300',   badge: 'bg-amber-500/20 text-amber-300'   },
  pull:   { bg: 'bg-blue-600/15',    text: 'text-blue-300',    badge: 'bg-blue-500/20 text-blue-300'     },
  legs:   { bg: 'bg-violet-600/15',  text: 'text-violet-300',  badge: 'bg-violet-500/20 text-violet-300' },
  rest:   { bg: 'bg-zinc-800/40',    text: 'text-zinc-500',    badge: 'bg-zinc-700 text-zinc-500'        },
  cardio: { bg: 'bg-emerald-600/15', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
  other:  { bg: 'bg-zinc-800/40',    text: 'text-zinc-400',    badge: 'bg-zinc-700 text-zinc-400'        },
};
