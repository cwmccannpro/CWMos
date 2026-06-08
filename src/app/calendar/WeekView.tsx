'use client';

import { useRef, useEffect, useMemo } from 'react';
import type { CalendarEvent } from '@/lib/adapters/calendar/types';
import { cn } from '@/lib/utils';
import {
  zonedHourFloat,
  formatZonedTime,
  isSameCarrierDay,
  isInstantOnCarrierDay,
} from '@/lib/adapters/calendar/timezone';

const HOUR_HEIGHT = 64;
const START_HOUR = 5;
const END_HOUR = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_DURATION_H = 18; // events longer than this → all-day banner

type CalColor = { bg: string; text: string; dot: string };

interface Props {
  events: CalendarEvent[];
  weekStart: Date;
  today: Date;
  getColor: (e: CalendarEvent) => CalColor;
  onEventClick: (e: CalendarEvent) => void;
}

function durationHours(e: CalendarEvent) {
  return (new Date(e.end).getTime() - new Date(e.start).getTime()) / 3600000;
}

function isAllDayDisplay(e: CalendarEvent) {
  return e.allDay || durationHours(e) >= MAX_DURATION_H;
}

// Greedy column layout — only for timed (short) events
function layoutDay(events: CalendarEvent[]): { event: CalendarEvent; col: number; total: number; span: number }[] {
  if (!events.length) return [];
  const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const colEnds: number[] = [];
  const raw: { event: CalendarEvent; col: number; startMs: number; endMs: number }[] = [];

  for (const e of sorted) {
    const startMs = new Date(e.start).getTime();
    const endMs = new Date(e.end).getTime();
    let col = colEnds.findIndex(ce => ce <= startMs);
    if (col === -1) { col = colEnds.length; colEnds.push(endMs); }
    else colEnds[col] = endMs;
    raw.push({ event: e, col, startMs, endMs });
  }

  const total = colEnds.length;

  return raw.map(({ event, col, startMs, endMs }) => {
    // Expand rightward through free columns
    let span = 1;
    for (let c = col + 1; c < total; c++) {
      const blocked = raw.some(a => a.col === c && a.startMs < endMs && a.endMs > startMs);
      if (blocked) break;
      span++;
    }
    return { event, col, total, span };
  });
}

function formatHour(h: number) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export function WeekView({ events, weekStart, today, getColor, onEventClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const top = (zonedHourFloat(new Date()) - START_HOUR) * HOUR_HEIGHT - 120;
    scrollRef.current?.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [weekStart]);

  // `weekStart` is a calendar-date carrier (UTC midnight of the Sunday); each day
  // carrier holds a pure date, so UTC getters read the intended calendar date.
  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 86400000)),
    [weekStart]
  );

  const todayIdx = days.findIndex(d => isSameCarrierDay(d, today));
  const nowTop = (zonedHourFloat(new Date()) - START_HOUR) * HOUR_HEIGHT;

  // Split events into all-day banners vs timed blocks (bucketed by calendar-zone day)
  const allDayByDay = days.map(d =>
    events.filter(e => isAllDayDisplay(e) && isInstantOnCarrierDay(new Date(e.start), d))
  );
  const timedByDay = days.map(d =>
    events.filter(e => !isAllDayDisplay(e) && isInstantOnCarrierDay(new Date(e.start), d))
  );
  const layoutByDay = timedByDay.map(layoutDay);
  const hasAllDay = allDayByDay.some(d => d.length > 0);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Day header row */}
      <div className="flex border-b border-zinc-800 bg-zinc-950 shrink-0">
        <div className="w-14 shrink-0 border-r border-zinc-800" />
        {days.map((day, i) => {
          const isToday = isSameCarrierDay(day, today);
          return (
            <div key={i} className="flex-1 text-center py-2 border-r border-zinc-800/40 last:border-r-0">
              <div className="text-[11px] text-zinc-500 uppercase tracking-wide">{DAY_LABELS[day.getUTCDay()]}</div>
              <div className={cn(
                'inline-flex w-8 h-8 items-center justify-center rounded-full text-sm font-medium mt-0.5',
                isToday ? 'bg-blue-600 text-white' : 'text-zinc-300'
              )}>
                {day.getUTCDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day / multi-day banners */}
      {hasAllDay && (
        <div className="flex border-b border-zinc-800 shrink-0 bg-zinc-950/40">
          <div className="w-14 shrink-0 border-r border-zinc-800 flex items-center justify-end pr-2">
            <span className="text-[10px] text-zinc-600">all‑day</span>
          </div>
          {allDayByDay.map((dayEvts, i) => (
            <div key={i} className="flex-1 border-r border-zinc-800/40 last:border-r-0 px-0.5 py-0.5 flex flex-col gap-0.5 min-h-[22px]">
              {dayEvts.map((e, j) => {
                const c = getColor(e);
                return (
                  <div key={`${e.calendarId}-${e.id}-${j}`} onClick={() => onEventClick(e)}
                    className={cn('text-[10px] rounded px-1 truncate cursor-pointer leading-5', c.bg, c.text)}>
                    {e.title}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          {/* Hour labels */}
          <div className="w-14 shrink-0 relative border-r border-zinc-800">
            {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
              <div key={i} style={{ position: 'absolute', top: i * HOUR_HEIGHT - 8, right: 0, left: 0 }}
                className="text-right text-[10px] text-zinc-600 pr-2 pt-1">
                {i > 0 ? formatHour(START_HOUR + i) : ''}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, dayIdx) => {
            const isToday = dayIdx === todayIdx;
            const laid = layoutByDay[dayIdx];
            return (
              <div key={dayIdx} className={cn(
                'flex-1 relative border-r border-zinc-800/40 last:border-r-0',
                isToday && 'bg-blue-950/10'
              )}>
                {/* Hour grid lines */}
                {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                  <div key={i} style={{ position: 'absolute', top: i * HOUR_HEIGHT, left: 0, right: 0 }}
                    className="border-t border-zinc-800/50" />
                ))}
                {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                  <div key={`h${i}`} style={{ position: 'absolute', top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2, left: 0, right: 0 }}
                    className="border-t border-zinc-800/20" />
                ))}

                {/* Current time line */}
                {isToday && nowTop >= 0 && nowTop <= TOTAL_HOURS * HOUR_HEIGHT && (
                  <div style={{ position: 'absolute', top: nowTop, left: 0, right: 0, zIndex: 20 }}
                    className="flex items-center pointer-events-none">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 -ml-1" />
                    <div className="flex-1 h-px bg-blue-500" />
                  </div>
                )}

                {/* Timed events */}
                {laid.map(({ event: e, col, total, span }, i) => {
                  const s = new Date(e.start);
                  const en = new Date(e.end);
                  const startH = zonedHourFloat(s);
                  const endH = Math.min(zonedHourFloat(en), END_HOUR);
                  const top = Math.max(0, (startH - START_HOUR) * HOUR_HEIGHT);
                  const height = Math.max(22, (endH - Math.max(startH, START_HOUR)) * HOUR_HEIGHT - 2);
                  const w = 100 / total;
                  const c = getColor(e);
                  return (
                    <div
                      key={`${e.calendarId}-${e.id}-${i}`}
                      onClick={() => onEventClick(e)}
                      style={{ position: 'absolute', top, height, left: `${col * w + 0.5}%`, width: `${w * span - 1}%`, zIndex: 10 }}
                      className={cn('rounded px-1 py-0.5 overflow-hidden cursor-pointer', c.bg, c.text)}
                    >
                      <div className="text-[10px] font-semibold leading-tight truncate">{e.title}</div>
                      {height > 30 && (
                        <div className="text-[9px] opacity-70 leading-tight mt-0.5">
                          {formatZonedTime(s)}{(endH - startH) > 0.3 ? ` – ${formatZonedTime(en)}` : ''}
                        </div>
                      )}
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
