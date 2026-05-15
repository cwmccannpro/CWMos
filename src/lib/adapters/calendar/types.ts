// Domain types for the calendar system.
// These are kept adapter-agnostic so the rest of the app never depends on
// iCal, Google Calendar, or any specific vendor shape.

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  allDay: boolean;
  calendarId?: string;
  calendarName?: string;
}

export interface CreateEventInput {
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  allDay?: boolean;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {
  id: string;
}

/**
 * Provider-agnostic calendar adapter interface.
 * Implement this interface for each calendar backend (iCal, Google, Outlook).
 */
export interface CalendarAdapter {
  getEvents(from: Date, to: Date): Promise<CalendarEvent[]>;
  createEvent(input: CreateEventInput): Promise<CalendarEvent>;
  updateEvent(input: UpdateEventInput): Promise<CalendarEvent>;
  deleteEvent(id: string): Promise<void>;
}
