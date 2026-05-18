import { NextResponse } from 'next/server';

import { getUserCredentials } from '@/lib/integrations';

function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

function parseIcsDate(val: string): Date | null {
  const v = val.trim().replace('Z', '');
  if (/^\d{8}$/.test(v))
    return new Date(`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T00:00:00Z`);
  if (/^\d{8}T\d{6}$/.test(v))
    return new Date(`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(9,11)}:${v.slice(11,13)}:${v.slice(13,15)}Z`);
  return null;
}

const DOW: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

interface RawEvent {
  id: string; title: string; start: Date; end: Date;
  description: string | null; location: string | null;
  allDay: boolean; calendarId: string; calendarName: string;
}

function expandRRule(
  base: RawEvent,
  rruleStr: string,
  exdates: Set<string>,
  from: Date | null,
  to: Date | null
): RawEvent[] {
  const rule: Record<string, string> = {};
  for (const p of rruleStr.split(';')) {
    const eq = p.indexOf('=');
    if (eq !== -1) rule[p.slice(0, eq)] = p.slice(eq + 1);
  }

  const freq = rule['FREQ'];
  if (!freq) return [base];

  const interval = parseInt(rule['INTERVAL'] ?? '1', 10);
  const maxCount = rule['COUNT'] ? parseInt(rule['COUNT'], 10) : Infinity;
  const until = rule['UNTIL'] ? parseIcsDate(rule['UNTIL']) : null;
  const byDay = rule['BYDAY']
    ? rule['BYDAY'].split(',').map(s => DOW[s.replace(/[+\-\d]/g, '').slice(-2)]).filter(n => n !== undefined) as number[]
    : null;

  const duration = base.end.getTime() - base.start.getTime();
  // Cap expansion: don't generate beyond "to" or 2 years from base start
  const cap = to ?? new Date(base.start.getTime() + 2 * 365 * 86400000);
  const limitTo = (until && until < cap) ? until : cap;

  const results: RawEvent[] = [];
  let count = 0;

  function add(start: Date) {
    if (start < base.start) return;
    if (start > limitTo) return;
    // For recurring instances, filter by START date being in the requested range
    if (from && start < from) return;
    if (to && start > to) return;
    const dk = `${start.getUTCFullYear()}${String(start.getUTCMonth()+1).padStart(2,'0')}${String(start.getUTCDate()).padStart(2,'0')}`;
    if (exdates.has(dk)) return;
    const end = new Date(start.getTime() + duration);
    results.push({ ...base, id: `${base.id}::${start.getTime()}`, start: new Date(start), end });
    count++;
  }

  if (freq === 'DAILY') {
    let cur = new Date(base.start);
    while (cur <= limitTo && count < maxCount) {
      add(cur); cur = new Date(cur.getTime() + interval * 86400000);
    }
  } else if (freq === 'WEEKLY') {
    const days = byDay ? [...new Set(byDay)].sort((a, b) => a - b) : [base.start.getUTCDay()];
    const wkst = rule['WKST'] ? (DOW[rule['WKST']] ?? 1) : 1;
    // Find start of week containing base.start
    const daysFromWkst = (base.start.getUTCDay() - wkst + 7) % 7;
    let weekStart = new Date(Date.UTC(
      base.start.getUTCFullYear(), base.start.getUTCMonth(),
      base.start.getUTCDate() - daysFromWkst,
      base.start.getUTCHours(), base.start.getUTCMinutes(), base.start.getUTCSeconds()
    ));
    while (weekStart <= limitTo && count < maxCount) {
      for (const dow of days) {
        const dFromWkst = (dow - wkst + 7) % 7;
        const candidate = new Date(weekStart.getTime() + dFromWkst * 86400000);
        if (candidate >= base.start && candidate <= limitTo) {
          add(candidate); if (count >= maxCount) break;
        }
      }
      weekStart = new Date(weekStart.getTime() + interval * 7 * 86400000);
    }
  } else if (freq === 'MONTHLY') {
    let cur = new Date(base.start);
    while (cur <= limitTo && count < maxCount) {
      add(cur);
      const next = new Date(cur);
      next.setUTCMonth(next.getUTCMonth() + interval);
      cur = next;
    }
  } else if (freq === 'YEARLY') {
    let cur = new Date(base.start);
    while (cur <= limitTo && count < maxCount) {
      add(cur);
      const next = new Date(cur);
      next.setUTCFullYear(next.getUTCFullYear() + interval);
      cur = next;
    }
  }

  return results;
}

function getVal(obj: Record<string, string>, prefix: string): string | undefined {
  const key = Object.keys(obj).find(k => k === prefix || k.startsWith(`${prefix};`));
  return key ? obj[key] : undefined;
}

function parseIcs(text: string, calendarId: string, from: Date | null, to: Date | null): RawEvent[] {
  const unfolded = unfold(text);
  const calendarName = (unfolded.match(/X-WR-CALNAME:([^\r\n]+)/) ?? [])[1]?.trim() ?? `Calendar ${calendarId}`;

  const rawEvents: Record<string, string>[] = [];
  let inEvent = false;
  let current: Record<string, string> = {};

  for (const raw of unfolded.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === 'BEGIN:VEVENT') { inEvent = true; current = {}; continue; }
    if (line === 'END:VEVENT') { inEvent = false; rawEvents.push({ ...current }); continue; }
    if (!inEvent) continue;
    const ci = line.indexOf(':');
    if (ci === -1) continue;
    current[line.slice(0, ci)] = line.slice(ci + 1)
      .replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\\\/g, '\\');
  }

  const results: RawEvent[] = [];

  for (const v of rawEvents) {
    const rawStart = getVal(v, 'DTSTART');
    const rawEnd = getVal(v, 'DTEND') ?? getVal(v, 'DTSTART');
    if (!rawStart) continue;
    const start = parseIcsDate(rawStart);
    const end = parseIcsDate(rawEnd ?? rawStart);
    if (!start || !end) continue;

    // Parse EXDATEs (comma-separated list of dates to skip)
    const exdateRaw = v['EXDATE'] ?? '';
    const exdates = new Set<string>(
      exdateRaw.split(',')
        .map(d => d.trim().split('T')[0].replace(/-/g, ''))
        .filter(d => /^\d{8}$/.test(d))
    );

    const base: RawEvent = {
      id: v['UID'] ?? `${calendarId}-${start.getTime()}`,
      title: v['SUMMARY'] ?? 'Untitled',
      start, end,
      description: v['DESCRIPTION'] ?? null,
      location: v['LOCATION'] ?? null,
      allDay: !/T/.test(rawStart),
      calendarId, calendarName,
    };

    const rrule = v['RRULE'];
    const isException = !!getVal(v, 'RECURRENCE-ID'); // modified occurrence — keep as-is

    if (rrule && !isException) {
      results.push(...expandRRule(base, rrule, exdates, from, to));
    } else {
      if (from && end < from) continue;
      if (to && start > to) continue;
      results.push(base);
    }
  }

  return results;
}

export async function GET(req: Request) {
  const { userId, credentials } = await getUserCredentials('ical');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const icalUrls: string[] = (credentials?.urls as string[]) ?? [];
  if (!icalUrls.length)
    return NextResponse.json({ error: 'No calendars connected. Add iCal URLs in Settings → Integrations.' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : null;
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : null;

  const all: RawEvent[] = [];

  await Promise.allSettled(icalUrls.map(async (url, idx) => {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'CWMControlCenter/1.0', Accept: 'text/calendar' },
        cache: 'no-store',
      });
      if (!res.ok) { console.error(`[cal] Feed ${idx} HTTP ${res.status}`); return; }
      all.push(...parseIcs(await res.text(), String(idx), from, to));
    } catch (err) {
      console.error(`[cal] Feed ${idx} error: ${err}`);
    }
  }));

  // Drop events from before current year
  const thisYear = new Date().getUTCFullYear();
  const current = all.filter(e => e.start.getUTCFullYear() >= thisYear);

  // Deduplicate: same calendarId + uid combination
  const seen = new Set<string>();
  const deduped = current.filter(e => {
    const k = `${e.calendarId}::${e.id}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

  deduped.sort((a, b) => a.start.getTime() - b.start.getTime());
  return NextResponse.json(deduped.map(e => ({ ...e, start: e.start.toISOString(), end: e.end.toISOString() })));
}
