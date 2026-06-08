export type CalColor = { bg: string; text: string; dot: string };

const NAMED: Record<string, CalColor> = {
  important:    { bg: 'bg-rose-600/20',   text: 'text-rose-300',   dot: 'text-rose-400'   },
  appointments: { bg: 'bg-yellow-600/20', text: 'text-yellow-300', dot: 'text-yellow-400' },
  sahara:       { bg: 'bg-violet-600/20', text: 'text-violet-300', dot: 'text-violet-400' },
  projects:     { bg: 'bg-purple-600/20', text: 'text-purple-300', dot: 'text-purple-400' },
  cwm:          { bg: 'bg-cyan-600/20',   text: 'text-cyan-300',   dot: 'text-cyan-400'   },
};

const PALETTE: CalColor[] = [
  { bg: 'bg-emerald-600/20', text: 'text-emerald-300', dot: 'text-emerald-400' },
  { bg: 'bg-orange-600/20',  text: 'text-orange-300',  dot: 'text-orange-400'  },
  { bg: 'bg-pink-600/20',    text: 'text-pink-300',    dot: 'text-pink-400'    },
];

export function resolveCalendarColor(name: string | undefined, idx: number): CalColor {
  if (name) { const c = NAMED[name.toLowerCase()]; if (c) return c; }
  return PALETTE[idx % PALETTE.length];
}

export function buildCalendarColorMap(
  events: Array<{ calendarName?: string; calendarId?: string }>
): Map<string, CalColor> {
  const map = new Map<string, CalColor>();
  let i = 0;
  for (const e of events) {
    const key = e.calendarName ?? e.calendarId ?? 'default';
    if (!map.has(key)) { map.set(key, resolveCalendarColor(e.calendarName, i)); i++; }
  }
  return map;
}

export const FALLBACK_COLOR: CalColor = {
  bg: 'bg-zinc-700/40', text: 'text-zinc-300', dot: 'text-zinc-400',
};
