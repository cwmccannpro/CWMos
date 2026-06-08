'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Calendar, CalendarClock } from 'lucide-react';
import type { CalendarEvent } from '@/lib/adapters/calendar/types';
import { buildCalendarColorMap, FALLBACK_COLOR } from '@/lib/adapters/calendar/colors';
import { cn } from '@/lib/utils';
import {
  CALENDAR_TZ,
  zonedHourFloat,
  zonedDateCarrier,
  formatZonedTime,
  isSameCarrierDay,
  isInstantOnCarrierDay,
} from '@/lib/adapters/calendar/timezone';
import type { WidgetProps } from '@/types';

// ─── Shared helpers ──────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

// Returns null when no iCal credentials are configured (503), [] when configured but no events
async function fetchRange(from: Date, to: Date): Promise<CalendarEvent[] | null> {
  const res = await fetch(`/api/calendar/events?from=${from.toISOString()}&to=${to.toISOString()}`);
  if (res.status === 503) return null;
  if (!res.ok) return [];
  const raw: any[] = await res.json();
  return raw
    .map((e) => ({ ...e, start: new Date(e.start), end: new Date(e.end) }))
    .filter((e) => e.start.getFullYear() >= CURRENT_YEAR);
}

// Compact time label (e.g. "7a", "7:35a") rendered in the calendar timezone.
function fmtTime(d: Date) {
  return formatZonedTime(d)
    .replace(/\s?AM/, 'a')
    .replace(/\s?PM/, 'p')
    .replace(':00', '');
}

// ─── CalendarUpcomingWidget (today's agenda with left-aligned times) ───────────

export function CalendarUpcomingWidget({ widgetInstanceId }: WidgetProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConfigured, setNotConfigured] = useState(false);

  useEffect(() => {
    // "Today" in the calendar timezone; pad the fetch window so events whose UTC
    // instant lands on an adjacent day are still returned, then filter to today.
    const todayCarrier = zonedDateCarrier(new Date());
    const from = new Date(todayCarrier.getTime() - 86400000);
    const to = new Date(todayCarrier.getTime() + 2 * 86400000);

    const apply = (data: CalendarEvent[] | null) => {
      if (data === null) { setNotConfigured(true); return; }
      setNotConfigured(false);
      setEvents(
        data
          .filter((e) => isInstantOnCarrierDay(e.start, todayCarrier))
          .sort((a, b) => a.start.getTime() - b.start.getTime())
      );
    };

    fetchRange(from, to).then(apply).finally(() => setLoading(false));
    const interval = setInterval(() => { fetchRange(from, to).then(apply); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [widgetInstanceId]);

  const colorMap = useMemo(() => buildCalendarColorMap(events), [events]);

  const dayLabel = new Date().toLocaleDateString('en-US', {
    timeZone: CALENDAR_TZ, weekday: 'long', month: 'short', day: 'numeric',
  });

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <CalendarClock size={11} style={{ color: '#00D4FF', flexShrink: 0 }} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.55rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(0,212,255,0.4)',
        }}>
          Today
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'rgba(160,175,200,0.35)' }}>
          {dayLabel}
        </span>
      </div>
      {loading ? (
        <div className="space-y-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 rounded animate-pulse" style={{ background: 'rgba(0,212,255,0.04)' }} />
          ))}
        </div>
      ) : notConfigured ? (
        <a href="/settings" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#00D4FF', textDecoration: 'underline', textUnderlineOffset: '3px', opacity: 0.7 }}>
          No calendars connected → Settings
        </a>
      ) : events.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'rgba(160,175,200,0.3)' }}>
          Nothing scheduled today
        </p>
      ) : (
        <ul className="space-y-px overflow-y-auto flex-1">
          {events.map((e, i) => {
            const c = colorMap.get(e.calendarName ?? e.calendarId ?? 'default') ?? FALLBACK_COLOR;
            return (
              <li
                key={`${e.id}-${i}`}
                className={cn('flex items-center gap-0 rounded overflow-hidden', c.bg)}
                style={{ border: '1px solid rgba(0,212,255,0.06)' }}
              >
                <span
                  className={cn('tabular-nums shrink-0 text-right px-2 py-1.5', c.text)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', width: '3.2rem' }}
                >
                  {e.allDay ? 'all‑d' : fmtTime(e.start)}
                </span>
                <div className={cn('w-px self-stretch bg-current opacity-30', c.text)} />
                <span
                  className="truncate flex-1 px-2 py-1.5"
                  style={{ fontSize: '0.7rem', color: 'rgba(220,235,255,0.82)' }}
                >
                  {e.title}
                </span>
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
  const [notConfigured, setNotConfigured] = useState(false);

  useEffect(() => {
    const todayCarrier = zonedDateCarrier(new Date());
    const from = new Date(todayCarrier.getTime() - 86400000);
    const to = new Date(todayCarrier.getTime() + 2 * 86400000);

    const apply = (data: CalendarEvent[] | null) => {
      if (data === null) { setNotConfigured(true); return; }
      setNotConfigured(false);
      setEvents(
        data
          .filter((e) => isInstantOnCarrierDay(e.start, todayCarrier))
          .sort((a, b) => a.start.getTime() - b.start.getTime())
      );
    };

    fetchRange(from, to).then(apply).finally(() => setLoading(false));
    const interval = setInterval(() => { fetchRange(from, to).then(apply); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [widgetInstanceId]);

  const colorMap = useMemo(() => buildCalendarColorMap(events), [events]);

  const dayLabel = new Date().toLocaleDateString('en-US', {
    timeZone: CALENDAR_TZ, weekday: 'long', month: 'short', day: 'numeric',
  });

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
      ) : notConfigured ? (
        <a href="/settings" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: '#00D4FF', textDecoration: 'underline', textUnderlineOffset: '3px', opacity: 0.7 }}>
          No calendars connected → Settings
        </a>
      ) : events.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'rgba(160,175,200,0.3)' }}>
          Nothing scheduled today
        </p>
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

// Sunday of the week containing `now`, as a calendar-date carrier (UTC midnight).
function weekSundayCarrier(now: Date) {
  const c = zonedDateCarrier(now);
  c.setUTCDate(c.getUTCDate() - c.getUTCDay());
  return c;
}

function durationH(e: CalendarEvent) {
  return (new Date(e.end).getTime() - new Date(e.start).getTime()) / 3_600_000;
}

function isAllDay(e: CalendarEvent) {
  return e.allDay || durationH(e) >= MAX_DUR;
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
  const [notConfigured, setNotConfigured] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const weekStart = useMemo(() => weekSundayCarrier(now), []); // eslint-disable-line react-hooks/exhaustive-deps
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86_400_000)),
    [weekStart]
  );

  useEffect(() => {
    // Pad the window so events on adjacent UTC days survive calendar-zone bucketing.
    const from = new Date(weekStart.getTime() - 86_400_000);
    const to = new Date(weekStart.getTime() + 7 * 86_400_000 + 86_400_000);

    setLoading(true);
    fetchRange(from, to).then(data => {
      if (data === null) setNotConfigured(true);
      else { setNotConfigured(false); setEvents(data); }
    }).finally(() => setLoading(false));

    const interval = setInterval(() => fetchRange(from, to).then(data => {
      if (data === null) setNotConfigured(true);
      else { setNotConfigured(false); setEvents(data); }
    }), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [widgetInstanceId, weekStart]);

  // Auto-scroll to current time
  useEffect(() => {
    const top = (zonedHourFloat(now) - W_START) * W_HOUR_H - 60;
    scrollRef.current?.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

  const colorMap = useMemo(() => buildCalendarColorMap(events), [events]);
  const todayCarrier = zonedDateCarrier(now);
  const todayIdx = days.findIndex((d) => isSameCarrierDay(d, todayCarrier));
  const nowTop = (zonedHourFloat(now) - W_START) * W_HOUR_H;

  const timedByDay = days.map((d) =>
    events.filter((e) => !isAllDay(e) && isInstantOnCarrierDay(new Date(e.start), d))
  );
  const allDayByDay = days.map((d) =>
    events.filter((e) => isAllDay(e) && isInstantOnCarrierDay(new Date(e.start), d))
  );
  const layoutByDay = timedByDay.map(layoutDay);
  const hasAllDay = allDayByDay.some((d) => d.length > 0);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'rgba(0,212,255,0.3)', letterSpacing: '0.12em' }}>LOADING…</div>
      </div>
    );
  }

  if (notConfigured) {
    return (
      <div className="h-full flex items-center justify-center">
        <a href="/settings" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#00D4FF', textDecoration: 'underline', textUnderlineOffset: '3px', opacity: 0.7 }}>
          No calendars connected → Settings
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day header */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid rgba(0,212,255,0.08)' }}>
        <div className="w-8 shrink-0" />
        {days.map((day, i) => {
          const isT = i === todayIdx;
          return (
            <div
              key={i}
              className="flex-1 text-center py-1"
              style={{ borderLeft: '1px solid rgba(0,212,255,0.06)' }}
            >
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.5rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: isT ? 'rgba(0,212,255,0.6)' : 'rgba(160,175,200,0.3)',
              }}>
                {W_DAYS[day.getUTCDay()]}
              </div>
              <div style={{
                display: 'inline-flex',
                width: '20px',
                height: '20px',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                marginTop: '2px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.58rem',
                fontWeight: isT ? '700' : '400',
                background: isT ? 'rgba(0,212,255,0.15)' : 'transparent',
                color: isT ? '#00D4FF' : 'rgba(160,175,200,0.45)',
                boxShadow: isT ? '0 0 8px rgba(0,212,255,0.3)' : 'none',
                border: isT ? '1px solid rgba(0,212,255,0.3)' : 'none',
              }}>
                {day.getUTCDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day strip */}
      {hasAllDay && (
        <div className="flex shrink-0" style={{ borderBottom: '1px solid rgba(0,212,255,0.06)', background: 'rgba(0,212,255,0.02)' }}>
          <div className="w-8 shrink-0 flex items-center justify-end pr-1">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.45rem', color: 'rgba(0,212,255,0.25)' }}>all</span>
          </div>
          {allDayByDay.map((dayEvts, i) => (
            <div
              key={i}
              className="flex-1 px-0.5 py-0.5 min-h-[16px]"
              style={{ borderLeft: '1px solid rgba(0,212,255,0.06)' }}
            >
              {dayEvts.map((e, j) => {
                const c = colorMap.get(e.calendarName ?? e.calendarId ?? 'default') ?? FALLBACK_COLOR;
                return (
                  <div
                    key={`${e.id}-${j}`}
                    className={cn('text-[8px] rounded px-0.5 truncate leading-4', c.bg, c.text)}
                    style={{ border: '1px solid rgba(0,212,255,0.1)' }}
                  >
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
          <div className="w-8 shrink-0 relative" style={{ borderRight: '1px solid rgba(0,212,255,0.06)' }}>
            {Array.from({ length: W_TOTAL }).map((_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: i * W_HOUR_H - 6,
                  right: 0,
                  left: 0,
                  textAlign: 'right',
                  paddingRight: '4px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.48rem',
                  color: 'rgba(0,212,255,0.2)',
                }}
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
                className="flex-1 relative"
                style={{
                  borderLeft: '1px solid rgba(0,212,255,0.05)',
                  background: isT ? 'rgba(0,212,255,0.025)' : 'transparent',
                }}
              >
                {/* Hour grid lines */}
                {Array.from({ length: W_TOTAL }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: i * W_HOUR_H,
                      left: 0, right: 0,
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                    }}
                  />
                ))}
                {Array.from({ length: W_TOTAL }).map((_, i) => (
                  <div
                    key={`h${i}`}
                    style={{
                      position: 'absolute',
                      top: i * W_HOUR_H + W_HOUR_H / 2,
                      left: 0, right: 0,
                      borderTop: '1px solid rgba(255,255,255,0.02)',
                    }}
                  />
                ))}

                {/* Current time — cyan line with glowing dot */}
                {isT && nowTop >= 0 && nowTop <= W_TOTAL * W_HOUR_H && (
                  <div
                    style={{
                      position: 'absolute',
                      top: nowTop,
                      left: 0, right: 0,
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#00D4FF',
                      flexShrink: 0,
                      marginLeft: '-3px',
                      boxShadow: '0 0 6px rgba(0,212,255,0.9), 0 0 12px rgba(0,212,255,0.4)',
                    }} />
                    <div style={{
                      flex: 1,
                      height: '1px',
                      background: 'linear-gradient(90deg, #00D4FF 0%, rgba(0,212,255,0.3) 70%, transparent 100%)',
                      boxShadow: '0 0 4px rgba(0,212,255,0.5)',
                    }} />
                  </div>
                )}

                {/* Event pills */}
                {laid.map(({ event: e, col, total, span }, i) => {
                  const s = new Date(e.start);
                  const en = new Date(e.end);
                  const startH = zonedHourFloat(s);
                  const endH = Math.min(zonedHourFloat(en), W_END);
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
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid rgba(0,212,255,0.15)',
                        cursor: 'default',
                      }}
                      className={cn(c.bg, c.text)}
                    >
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', fontWeight: '500', lineHeight: '1.2', padding: '2px 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.title}
                      </div>
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
