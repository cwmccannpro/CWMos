import { NextResponse } from 'next/server';

import { getUserCredentials, getServiceCredentials } from '@/lib/integrations';
import { CALENDAR_TZ } from '@/lib/adapters/calendar/timezone';

function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

// Convert a local wall-clock time in an IANA timezone to a UTC Date using Intl.
function parseTzidDate(v: string, tzid: string): Date {
  const iso = `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(9,11)}:${v.slice(11,13)}:${v.slice(13,15)}`;
  // Start by treating the components as UTC (candidate)
  const candidate = new Date(`${iso}Z`);
  // Find what the candidate looks like in the target timezone
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tzid,
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false,
  });
  const parts = dtf.formatToParts(candidate);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)!.value);
  const tzAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  // Shift candidate by the difference to land on the correct UTC instant
  return new Date(candidate.getTime() + (candidate.getTime() - tzAsUTC));
}

function parseIcsDate(val: string, tzid?: string): Date | null {
  const str = val.trim();
  const isUtc = str.endsWith('Z');
  const v = str.replace('Z', '');
  // All-day: anchor to midnight in the calendar timezone (deterministic across servers).
  if (/^\d{8}$/.test(v))
    return parseTzidDate(`${v}T000000`, CALENDAR_TZ);
  if (/^\d{8}T\d{6}$/.test(v)) {
    const iso = `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}T${v.slice(9,11)}:${v.slice(11,13)}:${v.slice(13,15)}`;
    if (isUtc) return new Date(`${iso}Z`);
    if (tzid) { try { return parseTzidDate(v, tzid); } catch { /* fall through */ } }
    // Floating (no Z, no TZID): interpret in the calendar timezone, not the ambient
    // server zone — otherwise the instant shifts depending on where this runs.
    try { return parseTzidDate(v, CALENDAR_TZ); } catch { return new Date(iso); }
  }
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

function getValWithTzid(obj: Record<string, string>, prefix: string): { value: string | undefined; tzid: string | undefined } {
  const key = Object.keys(obj).find(k => k === prefix || k.startsWith(`${prefix};`));
  if (!key) return { value: undefined, tzid: undefined };
  const tzidMatch = key.match(/TZID=([^;:]+)/);
  return { value: obj[key], tzid: tzidMatch?.[1] };
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
    const { value: rawStart, tzid: startTzid } = getValWithTzid(v, 'DTSTART');
    const { value: rawEnd } = getValWithTzid(v, 'DTEND');
    if (!rawStart) continue;
    const start = parseIcsDate(rawStart, startTzid);
    const end = parseIcsDate(rawEnd ?? rawStart, startTzid);
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
  let { userId, credentials } = await getUserCredentials('ical');

  // No browser session — fall back to service-role lookup (MC internal calls)
  if (!userId) {
    ({ userId, credentials } = await getServiceCredentials('ical'));
  }

  let icalUrls: string[];
  if ((credentials?.urls as string[] | undefined)?.length) {
    icalUrls = credentials!.urls as string[];
  } else if (process.env.ICAL_URLS) {
    icalUrls = process.env.ICAL_URLS.split(',').map((u) => u.trim()).filter(Boolean);
  } else if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } else {
    return NextResponse.json({ error: 'No calendars connected. Add iCal URLs in Settings → Integrations.' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : null;
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : null;

  const all: RawEvent[] = [];

  await Promise.allSettled(icalUrls.map(async (url, idx) => {
    // webcal:// is identical to https:// — Node fetch doesn't understand the protocol
    const fetchUrl = url.replace(/^webcal:\/\//i, 'https://');
    try {
      const res = await fetch(fetchUrl, {
        headers: { 'User-Agent': 'CWMControlCenter/1.0 (calendar sync)', Accept: 'text/calendar, text/plain, */*' },
        cache: 'no-store',
        redirect: 'follow',
      });
      if (!res.ok) { console.error(`[cal] Feed ${idx} HTTP ${res.status} — ${fetchUrl}`); return; }
      const text = await res.text();
      if (!text.includes('BEGIN:VCALENDAR')) {
        console.error(`[cal] Feed ${idx} — response is not ICS (got ${text.slice(0, 80)})`);
        return;
      }
      all.push(...parseIcs(text, String(idx), from, to));
    } catch (err) {
      const cause = err instanceof Error ? (err as any).cause ?? err.message : String(err);
      console.error(`[cal] Feed ${idx} fetch error — ${fetchUrl} — ${cause}`);
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
