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
const API_URL = '/api/health';

// Coerce any partial/legacy blob into a complete HealthData, merging the
// fitness schedule with defaults so newly added days always exist.
function normalize(parsed: Partial<HealthData> | null | undefined): HealthData {
  if (!parsed) return structuredClone(DEFAULT_DATA);
  return {
    supplements: parsed.supplements ?? [],
    supplementLog: parsed.supplementLog ?? {},
    fitnessSchedule: DEFAULT_SCHEDULE.map((def) => {
      const saved = parsed.fitnessSchedule?.find((d) => d.dayOfWeek === def.dayOfWeek);
      return saved ?? def;
    }),
  };
}

/** Synchronous read from localStorage — used for instant first paint. */
export function loadHealth(): HealthData {
  if (typeof window === 'undefined') return structuredClone(DEFAULT_DATA);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    return normalize(JSON.parse(raw) as Partial<HealthData>);
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

function localSave(data: HealthData): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// Debounced push to Supabase so rapid edits collapse into one request.
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function cloudSave(data: HealthData): void {
  if (typeof window === 'undefined') return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    }).catch(() => { /* non-fatal — localStorage still holds the data */ });
  }, 1200);
}

/** Persist everywhere: localStorage immediately, Supabase debounced. */
export function saveHealth(data: HealthData): void {
  localSave(data);
  cloudSave(data);
}

// True when the blob holds real user data — any supplements, any logged doses,
// or a fitness schedule that's been customized away from the defaults. Used so
// a bare default schedule isn't mistaken for "has data" (which would let it
// clobber a real schedule on another device).
function hasContent(d: HealthData): boolean {
  return (
    d.supplements.length > 0 ||
    Object.keys(d.supplementLog).length > 0 ||
    JSON.stringify(d.fitnessSchedule) !== JSON.stringify(DEFAULT_SCHEDULE)
  );
}

/**
 * Reconcile with the cloud after the initial local paint.
 * Cloud is the source of truth when it has data; otherwise local data is
 * pushed up to seed it. Call once on mount, after a synchronous loadHealth().
 */
export function syncHealth(onResolve: (data: HealthData) => void): void {
  if (typeof window === 'undefined') return;
  // Snapshot local at fetch start. If it changes before the fetch resolves, the
  // user edited mid-flight — their data is fresher (and already saved), so we
  // must NOT overwrite it with the older cloud copy.
  const before = localStorage.getItem(STORAGE_KEY);
  const local = loadHealth();
  fetch(API_URL)
    .then((r) => (r.ok ? r.json() : null))
    .then((res) => {
      if (localStorage.getItem(STORAGE_KEY) !== before) return; // edited mid-flight — leave it
      const cloud = res?.data ? normalize(res.data as Partial<HealthData>) : null;
      if (cloud && hasContent(cloud)) {
        localSave(cloud);
        onResolve(cloud);
      } else if (hasContent(local)) {
        // Cloud empty but this browser has data — seed the cloud from it.
        cloudSave(local);
      }
    })
    .catch(() => { /* offline — keep showing local */ });
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
