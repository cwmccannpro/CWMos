'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import type { CalendarEvent } from '@/lib/adapters/calendar/types';
import { cn } from '@/lib/utils';
import { WeekView } from './WeekView';

import { buildCalendarColorMap, FALLBACK_COLOR } from '@/lib/adapters/calendar/colors';
import type { CalColor } from '@/lib/adapters/calendar/colors';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

type ViewMode = 'month' | 'week';

// Get Sunday of the week containing `date` (using UTC day)
function getWeekSunday(date: Date): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const CURRENT_YEAR = new Date().getFullYear();

// Returns null when no iCal credentials are configured (503), [] when configured but no events
async function fetchEvents(from: Date, to: Date): Promise<CalendarEvent[] | null> {
  const res = await fetch(`/api/calendar/events?from=${from.toISOString()}&to=${to.toISOString()}`);
  if (res.status === 503) return null;
  if (!res.ok) return [];
  const raw: any[] = await res.json();
  return raw
    .map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end) }))
    .filter(e => e.start.getUTCFullYear() >= CURRENT_YEAR);
}

export default function CalendarPage() {
  const [today] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notConfigured, setNotConfigured] = useState(false);
  const [hiddenCals, setHiddenCals] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Week start (Sunday) for week view
  const weekStart = useMemo(() => getWeekSunday(viewDate), [viewDate]);

  useEffect(() => {
    let from: Date, to: Date;
    if (viewMode === 'week') {
      from = new Date(weekStart);
      to = new Date(weekStart.getTime() + 7 * 86400000 - 1);
    } else {
      from = new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth(), 1));
      to = new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth() + 1, 0, 23, 59, 59));
    }

    setLoading(true);
    fetchEvents(from, to).then(result => {
      if (result === null) { setNotConfigured(true); setEvents([]); }
      else { setNotConfigured(false); setEvents(result); }
    }).finally(() => setLoading(false));

    const interval = setInterval(() => {
      fetchEvents(from, to).then(result => {
        if (result === null) { setNotConfigured(true); setEvents([]); }
        else { setNotConfigured(false); setEvents(result); }
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [viewDate, viewMode, weekStart]);

  const colorMap = useMemo(() => buildCalendarColorMap(events), [events]);
  const getColor = useCallback((e: CalendarEvent): CalColor =>
    colorMap.get(e.calendarName ?? e.calendarId ?? 'default') ?? FALLBACK_COLOR, [colorMap]);

  const calendarList = useMemo(() => {
    const seen = new Map<string, { label: string; count: number }>();
    for (const e of events) {
      const key = e.calendarName ?? e.calendarId ?? 'default';
      const entry = seen.get(key);
      if (!entry) seen.set(key, { label: e.calendarName ?? key, count: 1 });
      else entry.count++;
    }
    return Array.from(seen.entries());
  }, [events]);

  function toggleCal(key: string) {
    setHiddenCals(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  const visibleEvents = useMemo(
    () => events.filter(e => !hiddenCals.has(e.calendarName ?? e.calendarId ?? 'default')),
    [events, hiddenCals]
  );

  function navigate(dir: number) {
    setViewDate(d => {
      if (viewMode === 'week') return new Date(d.getTime() + dir * 7 * 86400000);
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + dir, 1));
    });
  }

  function goToday() { setViewDate(new Date()); }

  // Month view helpers
  const firstDayOfMonth = new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth(), 1));
  const startOffset = firstDayOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth() + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  function getMonthEventsForDay(day: number) {
    return visibleEvents.filter(e => {
      const d = new Date(e.start);
      return d.getUTCFullYear() === viewDate.getUTCFullYear()
        && d.getUTCMonth() === viewDate.getUTCMonth()
        && d.getUTCDate() === day;
    });
  }

  const headerLabel = viewMode === 'week'
    ? (() => {
        const end = new Date(weekStart.getTime() + 6 * 86400000);
        const sm = MONTHS[weekStart.getUTCMonth()], em = MONTHS[end.getUTCMonth()];
        return sm === em
          ? `${sm} ${weekStart.getUTCDate()}–${end.getUTCDate()}, ${weekStart.getUTCFullYear()}`
          : `${sm} ${weekStart.getUTCDate()} – ${em} ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
      })()
    : `${MONTHS[viewDate.getUTCMonth()]} ${viewDate.getUTCFullYear()}`;

  const selectedDayEvents = selectedDay
    ? visibleEvents.filter(e => {
        const d = new Date(e.start);
        return d.getUTCFullYear() === selectedDay.getUTCFullYear()
          && d.getUTCMonth() === selectedDay.getUTCMonth()
          && d.getUTCDate() === selectedDay.getUTCDate();
      }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    : [];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-44 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col py-3 px-2 gap-1 overflow-y-auto">
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider px-1 mb-1">Calendars</p>
        {loading && calendarList.length === 0 && <p className="text-zinc-600 text-xs px-1">Syncing…</p>}
        {calendarList.map(([key, { label, count }]) => {
          const color = colorMap.get(key) ?? FALLBACK_COLOR;
          const hidden = hiddenCals.has(key);
          return (
            <button key={key} onClick={() => toggleCal(key)}
              className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg text-left w-full text-xs transition-colors',
                hidden ? 'opacity-40 hover:opacity-60' : 'hover:bg-zinc-800')}>
              <Circle size={9} className={cn('shrink-0 fill-current', color.dot)} />
              <span className={cn('truncate flex-1', hidden ? 'text-zinc-500' : 'text-zinc-300')}>{label}</span>
              <span className="text-zinc-600 text-[10px] shrink-0">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
              <ChevronLeft size={15} />
            </button>
            <button onClick={goToday} className="px-2.5 py-1 rounded text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
              Today
            </button>
            <button onClick={() => navigate(1)} className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
              <ChevronRight size={15} />
            </button>
            <div className="flex items-center gap-2 ml-2">
              <CalendarDays size={15} className="text-blue-400" />
              <span className="text-zinc-100 text-sm font-medium">{headerLabel}</span>
              {loading && <span className="text-zinc-600 text-xs">Syncing…</span>}
            </div>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden border border-zinc-700 text-xs">
            {(['week', 'month'] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={cn('px-3 py-1.5 capitalize transition-colors',
                  viewMode === m ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300')}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Not-configured banner */}
        {notConfigured && (
          <div className="shrink-0 px-4 py-2.5 flex items-center gap-3" style={{ background: 'rgba(0,212,255,0.04)', borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.08em', color: 'rgba(0,212,255,0.6)' }}>
              No calendars connected.
            </span>
            <a href="/settings" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.08em', color: '#00D4FF', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              Add iCal URL in Settings →
            </a>
          </div>
        )}

        {/* Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {viewMode === 'week' ? (
            <div className="flex-1 min-w-0 overflow-hidden">
              <WeekView
                events={visibleEvents}
                weekStart={weekStart}
                today={today}
                getColor={getColor}
                onEventClick={setSelectedEvent}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-zinc-500 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-zinc-800 rounded-xl overflow-hidden border border-zinc-800">
                {Array.from({ length: totalCells }).map((_, idx) => {
                  const dayNum = idx - startOffset + 1;
                  const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
                  const isToday = isCurrentMonth && dayNum === today.getUTCDate()
                    && viewDate.getUTCMonth() === today.getUTCMonth()
                    && viewDate.getUTCFullYear() === today.getUTCFullYear();
                  const dayEvts = isCurrentMonth ? getMonthEventsForDay(dayNum) : [];
                  const isSelected = selectedDay
                    && selectedDay.getUTCDate() === dayNum
                    && selectedDay.getUTCMonth() === viewDate.getUTCMonth()
                    && selectedDay.getUTCFullYear() === viewDate.getUTCFullYear();

                  return (
                    <div key={idx}
                      onClick={() => isCurrentMonth && setSelectedDay(new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth(), dayNum)))}
                      className={cn('bg-zinc-900 min-h-[80px] p-1.5 cursor-pointer transition-colors',
                        isCurrentMonth ? 'hover:bg-zinc-800' : 'opacity-30',
                        isSelected && 'ring-1 ring-inset ring-blue-500')}>
                      <span className={cn('inline-flex w-6 h-6 items-center justify-center rounded-full text-xs',
                        isToday ? 'bg-blue-600 text-white font-semibold' : 'text-zinc-400')}>
                        {isCurrentMonth ? dayNum : ''}
                      </span>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvts.slice(0, 3).map((e, i) => {
                          const c = getColor(e);
                          return (
                            <div key={`${e.calendarId}-${e.id}-${i}`}
                              className={cn('text-[10px] rounded px-1 truncate', c.bg, c.text)}>
                              {e.title}
                            </div>
                          );
                        })}
                        {dayEvts.length > 3 && <div className="text-[10px] text-zinc-500">+{dayEvts.length - 3} more</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day detail panel (month view only) */}
          {viewMode === 'month' && (
            <div className="w-64 border-l border-zinc-800 p-4 overflow-y-auto shrink-0">
              <h2 className="text-zinc-300 text-sm font-medium mb-3">
                {selectedDay
                  ? selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
                  : 'Select a day'}
              </h2>
              {selectedDay && selectedDayEvents.length === 0 && <p className="text-zinc-600 text-sm">No events.</p>}
              <div className="space-y-2">
                {selectedDayEvents.map((event, i) => {
                  const c = getColor(event);
                  const s = new Date(event.start);
                  const en = new Date(event.end);
                  return (
                    <div key={`${event.calendarId}-${event.id}-${i}`}
                      className={cn('p-3 rounded-lg border border-zinc-700/60', c.bg)}>
                      <div className="flex items-start gap-1.5">
                        <Circle size={7} className={cn('mt-1.5 shrink-0 fill-current', c.dot)} />
                        <div className="min-w-0">
                          <p className="text-zinc-200 text-sm font-medium leading-snug">{event.title}</p>
                          <p className={cn('text-xs mt-0.5', c.text)}>{event.calendarName}</p>
                          {!event.allDay && (
                            <p className="text-zinc-500 text-xs mt-0.5">
                              {s.getUTCHours()}:{String(s.getUTCMinutes()).padStart(2,'0')} – {en.getUTCHours()}:{String(en.getUTCMinutes()).padStart(2,'0')}
                            </p>
                          )}
                          {event.location && <p className="text-zinc-500 text-xs mt-0.5 truncate">{event.location}</p>}
                          {event.description && <p className="text-zinc-400 text-xs mt-1 line-clamp-3">{event.description}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event detail modal (week view) */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedEvent(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 max-w-sm w-full mx-4 shadow-xl"
            onClick={e => e.stopPropagation()}>
            {(() => {
              const c = getColor(selectedEvent);
              const s = new Date(selectedEvent.start);
              const en = new Date(selectedEvent.end);
              return (
                <>
                  <div className="flex items-start gap-2 mb-3">
                    <Circle size={8} className={cn('mt-1.5 shrink-0 fill-current', c.dot)} />
                    <div>
                      <p className="text-zinc-100 font-semibold text-base">{selectedEvent.title}</p>
                      <p className={cn('text-xs mt-0.5', c.text)}>{selectedEvent.calendarName}</p>
                    </div>
                  </div>
                  {!selectedEvent.allDay && (
                    <p className="text-zinc-400 text-sm mb-2">
                      {s.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                      {' · '}
                      {s.getUTCHours()}:{String(s.getUTCMinutes()).padStart(2,'0')} – {en.getUTCHours()}:{String(en.getUTCMinutes()).padStart(2,'0')}
                    </p>
                  )}
                  {selectedEvent.location && <p className="text-zinc-500 text-sm mb-2">📍 {selectedEvent.location}</p>}
                  {selectedEvent.description && <p className="text-zinc-400 text-sm">{selectedEvent.description}</p>}
                  <button onClick={() => setSelectedEvent(null)}
                    className="mt-4 w-full py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-sm hover:bg-zinc-700 transition-colors">
                    Close
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
