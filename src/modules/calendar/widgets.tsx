'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Calendar, CalendarClock } from 'lucide-react';
import type { CalendarEvent } from '@/lib/adapters/calendar/types';
import { buildCalendarColorMap, FALLBACK_COLOR } from '@/lib/adapters/calendar/colors';
import { cn } from '@/lib/utils';
import type { WidgetProps } from '@/types';

// ─── Shared helpers ──────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

async function fetchRange(from: Date, to: Date): Promise<CalendarEvent[]> {
  const res = await fetch(`/api/calendar/events?from=${from.toISOString()}&to=${to.toISOString()}`);
  if (!res.ok) return [];
  const raw: any[] = await res.json();
  return raw
    .map((e) => ({ ...e, start: new Date(e.start), end: new Date(e.end) }))
    .filter((e) => e.start.getUTCFullYear() >= CURRENT_YEAR);
}

function fmtTime(d: Date) {
  const h = d.getUTCHours(), m = d.getUTCMinutes();
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const suf = h < 12 ? 'a' : 'p';
  return m === 0 ? `${hr}${suf}` : `${hr}:${String(m).padStart(2, '0')}${suf}`;
}

// ─── CalendarUpcomingWidget (today's agenda with left-aligned times) ───────────

export function CalendarUpcomingWidget({ widgetInstanceId }: WidgetProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const from = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const to   = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59));

    fetchRange(from, to)
      .then((data) => setEvents(data.sort((a, b) => a.start.getTime() - b.start.getTime())))
      .finally(() => setLoading(false));

    const interval = setInterval(async () => {
      const data = await fetchRange(from, to);
      setEvents(data.sort((a, b) => a.start.getTime() - b.start.getTime()));
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [widgetInstanceId]);

  const colorMap = useMemo(() => buildCalendarColorMap(events), [events]);

  const dayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <CalendarClock size={12} className="text-blue-400 shrink-0" />
        <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Today</span>
        <span className="text-zinc-600 text-[10px] truncate">{dayLabel}</span>
      </div>
      {loading ? (
        <div className="space-y-1.5">
          {[1, 2, 3].map((i) => <div key={i} className="h-7 bg-zinc-800 rounded animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <p className="text-zinc-600 text-xs">Nothing scheduled today</p>
      ) : (
        <ul className="space-y-px overflow-y-auto flex-1">
          {events.map((e, i) => {
            const c = colorMap.get(e.calendarName ?? e.calendarId ?? 'default') ?? FALLBACK_COLOR;
            return (
              <li key={`${e.id}-${i}`} className={cn('flex items-center gap-0 rounded overflow-hidden text-xs', c.bg)}>
                <span className={cn('tabular-nums shrink-0 text-[10px] w-14 text-right px-2 py-1.5 font-medium', c.text)}>
                  {e.allDay ? 'all‑day' : fmtTime(e.start)}
                </span>
                <div className={cn('w-px self-stretch', c.text, 'opacity-40 bg-current')} />
                <span className="text-zinc-200 truncate flex-1 px-2 py-1.5">{e.title}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── CalendarDayWidget ────────────────────────────────────────────────────────

export function CalendarDayWidget({ widgetInstanceId }: WidgetProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const from = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const to   = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59));
    fetchRange(from, to)
      .then((data) => setEvents(data.sort((a, b) => a.start.getTime() - b.start.getTime())))
      .finally(() => setLoading(false));

    const interval = setInterval(async () => {
      const data = await fetchRange(from, to);
      setEvents(data.sort((a, b) => a.start.getTime() - b.start.getTime()));
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [widgetInstanceId]);

  const colorMap = useMemo(() => buildCalendarColorMap(events), [events]);

  const today = new Date();
  const dayLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <Calendar size={12} className="text-blue-400 shrink-0" />
        <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Today</span>
        <span className="text-zinc-600 text-[10px] truncate">{dayLabel}</span>
      </div>
      {loading ? (
        <div className="space-y-1.5">
          {[1, 2, 3].map((i) => <div key={i} className="h-7 bg-zinc-800 rounded animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <p className="text-zinc-600 text-xs">Nothing scheduled today</p>
      ) : (
        <ul className="space-y-1 overflow-y-auto flex-1">
          {events.map((e, i) => {
            const c = colorMap.get(e.calendarName ?? e.calendarId ?? 'default') ?? FALLBACK_COLOR;
            return (
              <li key={`${e.id}-${i}`} className={cn('flex items-center gap-2 px-2 py-1 rounded text-xs', c.bg)}>
                <span className={cn('tabular-nums shrink-0 text-[10px] w-10 text-right', c.text)}>
                  {e.allDay ? 'all‑day' : fmtTime(e.start)}
                </span>
                <span className="text-zinc-200 truncate flex-1">{e.title}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── CalendarWeekWidget ───────────────────────────────────────────────────────

const W_HOUR_H = 28;
const W_START  = 6;
const W_END    = 22;
const W_TOTAL  = W_END - W_START;
const W_DAYS   = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MAX_DUR  = 18;

function weekSunday(d: Date) {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() - out.getUTCDay());
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function durationH(e: CalendarEvent) {
  return (new Date(e.end).getTime() - new Date(e.start).getTime()) / 3_600_000;
}

function isAllDay(e: CalendarEvent) {
  return e.allDay || durationH(e) >= MAX_DUR;
}

function isSameUTCDay(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate();
}

function layoutDay(evts: CalendarEvent[]) {
  if (!evts.length) return [] as { event: CalendarEvent; col: number; total: number; span: number }[];
  const sorted = [...evts].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const colEnds: number[] = [];
  const raw: { event: CalendarEvent; col: number; sMs: number; eMs: number }[] = [];
  for (const e of sorted) {
    const sMs = new Date(e.start).getTime();
    const eMs = new Date(e.end).getTime();
    let col = colEnds.findIndex((c) => c <= sMs);
    if (col === -1) { col = colEnds.length; colEnds.push(eMs); } else colEnds[col] = eMs;
    raw.push({ event: e, col, sMs, eMs });
  }
  const total = colEnds.length;
  return raw.map(({ event, col, sMs, eMs }) => {
    let span = 1;
    for (let c = col + 1; c < total; c++) {
      if (raw.some((a) => a.col === c && a.sMs < eMs && a.eMs > sMs)) break;
      span++;
    }
    return { event, col, total, span };
  });
}

function fmtHour(h: number) {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

export function CalendarWeekWidget({ widgetInstanceId }: WidgetProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const weekStart = useMemo(() => weekSunday(now), []); // eslint-disable-line react-hooks/exhaustive-deps
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86_400_000)),
    [weekStart]
  );

  useEffect(() => {
    const from = new Date(weekStart);
    const to = new Date(weekStart.getTime() + 7 * 86_400_000 - 1);

    setLoading(true);
    fetchRange(from, to).then(setEvents).finally(() => setLoading(false));

    const interval = setInterval(() => fetchRange(from, to).then(setEvents), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [widgetInstanceId, weekStart]);

  // Auto-scroll to current time
  useEffect(() => {
    const top = (now.getUTCHours() - W_START + now.getUTCMinutes() / 60) * W_HOUR_H - 60;
    scrollRef.current?.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

  const colorMap = useMemo(() => buildCalendarColorMap(events), [events]);
  const today = new Date();
  const todayIdx = days.findIndex((d) => isSameUTCDay(d, today));
  const nowTop = (now.getUTCHours() - W_START + now.getUTCMinutes() / 60) * W_HOUR_H;

  const timedByDay = days.map((d) =>
    events.filter((e) => !isAllDay(e) && isSameUTCDay(new Date(e.start), d))
  );
  const allDayByDay = days.map((d) =>
    events.filter((e) => isAllDay(e) && isSameUTCDay(new Date(e.start), d))
  );
  const layoutByDay = timedByDay.map(layoutDay);
  const hasAllDay = allDayByDay.some((d) => d.length > 0);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-zinc-600 text-xs">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day header */}
      <div className="flex border-b border-zinc-800 shrink-0">
        <div className="w-8 shrink-0" />
        {days.map((day, i) => {
          const isT = i === todayIdx;
          return (
            <div key={i} className="flex-1 text-center py-1 border-l border-zinc-800/40 first:border-l-0">
              <div className="text-[9px] text-zinc-600 uppercase">{W_DAYS[day.getUTCDay()]}</div>
              <div className={cn(
                'inline-flex w-5 h-5 items-center justify-center rounded-full text-[10px] font-medium mt-0.5',
                isT ? 'bg-blue-600 text-white' : 'text-zinc-400'
              )}>
                {day.getUTCDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day strip */}
      {hasAllDay && (
        <div className="flex border-b border-zinc-800 shrink-0 bg-zinc-950/40">
          <div className="w-8 shrink-0 flex items-center justify-end pr-1">
            <span className="text-[8px] text-zinc-700">all‑d</span>
          </div>
          {allDayByDay.map((dayEvts, i) => (
            <div key={i} className="flex-1 border-l border-zinc-800/40 first:border-l-0 px-0.5 py-0.5 min-h-[16px]">
              {dayEvts.map((e, j) => {
                const c = colorMap.get(e.calendarName ?? e.calendarId ?? 'default') ?? FALLBACK_COLOR;
                return (
                  <div key={`${e.id}-${j}`} className={cn('text-[8px] rounded px-0.5 truncate leading-4', c.bg, c.text)}>
                    {e.title}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: W_TOTAL * W_HOUR_H }}>
          {/* Hour labels */}
          <div className="w-8 shrink-0 relative border-r border-zinc-800">
            {Array.from({ length: W_TOTAL }).map((_, i) => (
              <div
                key={i}
                style={{ position: 'absolute', top: i * W_HOUR_H - 6, right: 0, left: 0 }}
                className="text-right text-[8px] text-zinc-700 pr-1"
              >
                {i > 0 ? fmtHour(W_START + i) : ''}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => {
            const isT = dayIdx === todayIdx;
            const laid = layoutByDay[dayIdx];
            return (
              <div
                key={dayIdx}
                className={cn(
                  'flex-1 relative border-l border-zinc-800/40 first:border-l-0',
                  isT && 'bg-blue-950/10'
                )}
              >
                {/* Grid lines */}
                {Array.from({ length: W_TOTAL }).map((_, i) => (
                  <div
                    key={i}
                    style={{ position: 'absolute', top: i * W_HOUR_H, left: 0, right: 0 }}
                    className="border-t border-zinc-800/50"
                  />
                ))}
                {Array.from({ length: W_TOTAL }).map((_, i) => (
                  <div
                    key={`h${i}`}
                    style={{ position: 'absolute', top: i * W_HOUR_H + W_HOUR_H / 2, left: 0, right: 0 }}
                    className="border-t border-zinc-800/20"
                  />
                ))}

                {/* Current time */}
                {isT && nowTop >= 0 && nowTop <= W_TOTAL * W_HOUR_H && (
                  <div
                    style={{ position: 'absolute', top: nowTop, left: 0, right: 0, zIndex: 20 }}
                    className="flex items-center pointer-events-none"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 -ml-0.75" />
                    <div className="flex-1 h-px bg-blue-500" />
                  </div>
                )}

                {/* Events */}
                {laid.map(({ event: e, col, total, span }, i) => {
                  const s = new Date(e.start);
                  const en = new Date(e.end);
                  const startH = s.getUTCHours() + s.getUTCMinutes() / 60;
                  const endH = Math.min(en.getUTCHours() + en.getUTCMinutes() / 60, W_END);
                  const top = Math.max(0, (startH - W_START) * W_HOUR_H);
                  const height = Math.max(14, (endH - Math.max(startH, W_START)) * W_HOUR_H - 1);
                  const w = 100 / total;
                  const c = colorMap.get(e.calendarName ?? e.calendarId ?? 'default') ?? FALLBACK_COLOR;
                  return (
                    <div
                      key={`${e.id}-${i}`}
                      style={{
                        position: 'absolute', top, height,
                        left: `${col * w + 0.5}%`,
                        width: `${w * span - 1}%`,
                        zIndex: 10,
                      }}
                      className={cn('rounded px-0.5 overflow-hidden cursor-default', c.bg, c.text)}
                    >
                      <div className="text-[8px] font-medium leading-tight truncate">{e.title}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
