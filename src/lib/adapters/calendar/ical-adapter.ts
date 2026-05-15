import type {
  CalendarAdapter,
  CalendarEvent,
  CreateEventInput,
  UpdateEventInput,
} from './types';

// iCal feeds are read-only — writes are no-ops with a local in-memory store
class ICalAdapter implements CalendarAdapter {
  private localCreated: CalendarEvent[] = [];

  async getEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
    const res = await fetch(
      `/api/calendar/events?from=${from.toISOString()}&to=${to.toISOString()}`
    );
    if (!res.ok) return this.localCreated;
    const raw: any[] = await res.json();
    const remote: CalendarEvent[] = raw.map((e) => ({
      ...e,
      start: new Date(e.start),
      end: new Date(e.end),
    }));
    // Merge locally-created events that fall in range
    const local = this.localCreated.filter((e) => e.start >= from && e.start <= to);
    return [...remote, ...local].sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  async createEvent(input: CreateEventInput): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      id: `local-${Date.now()}`,
      allDay: input.allDay ?? false,
      ...input,
    };
    this.localCreated.push(event);
    return event;
  }

  async updateEvent(input: UpdateEventInput): Promise<CalendarEvent> {
    const idx = this.localCreated.findIndex((e) => e.id === input.id);
    if (idx === -1) throw new Error(`Event not found: ${input.id}`);
    this.localCreated[idx] = { ...this.localCreated[idx], ...input };
    return this.localCreated[idx];
  }

  async deleteEvent(id: string): Promise<void> {
    this.localCreated = this.localCreated.filter((e) => e.id !== id);
  }
}

export const calendarAdapter = new ICalAdapter();
