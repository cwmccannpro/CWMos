import { calendarAdapter } from '@/lib/adapters/calendar/ical-adapter';
import { CALENDAR_TZ } from '@/lib/adapters/calendar/timezone';
import type { ModuleAction, ActionResult } from '@/types';

const MODULE_ID = 'calendar';

export const calendarActions: ModuleAction[] = [
  {
    id: 'get-upcoming',
    moduleId: MODULE_ID,
    name: 'Get Upcoming Events',
    description: 'Retrieve upcoming calendar events within a date range',
    examples: [
      "What's on my calendar today?",
      'Show me upcoming events',
      "What do I have this week?",
    ],
    parameters: [],
    async execute(): Promise<ActionResult> {
      const from = new Date();
      const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const events = await calendarAdapter.getEvents(from, to);

      if (events.length === 0) {
        return { success: true, message: 'No upcoming events found.', data: [] };
      }

      const list = events
        .map(
          (e) =>
            `• ${e.title} — ${e.start.toLocaleDateString('en-US', {
              timeZone: CALENDAR_TZ,
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}`
        )
        .join('\n');

      return {
        success: true,
        message: `Here are your upcoming events:\n${list}`,
        data: events,
      };
    },
  },

  {
    id: 'create-event',
    moduleId: MODULE_ID,
    name: 'Create Event',
    description: 'Create a new calendar event',
    examples: [
      'Add to my calendar today at 7pm to get toilet paper',
      'Schedule a meeting tomorrow at 2pm',
      'Create a calendar event for dentist appointment Friday at 10am',
    ],
    parameters: [
      {
        name: 'title',
        type: 'string',
        description: 'Event title',
        required: true,
      },
      {
        name: 'start',
        type: 'date',
        description: 'Start time',
        required: true,
      },
      {
        name: 'end',
        type: 'date',
        description: 'End time (optional, defaults to 1 hour after start)',
        required: false,
      },
      {
        name: 'description',
        type: 'string',
        description: 'Optional event description',
        required: false,
      },
    ],
    async execute(params): Promise<ActionResult> {
      const title = (params.title as string) || 'New Event';
      const start = params.start ? new Date(params.start as string) : new Date();
      const end = params.end
        ? new Date(params.end as string)
        : new Date(start.getTime() + 60 * 60 * 1000);

      const event = await calendarAdapter.createEvent({
        title,
        start,
        end,
        description: params.description as string | undefined,
      });

      return {
        success: true,
        message: `Created event "${event.title}" on ${event.start.toLocaleDateString(
          'en-US',
          { timeZone: CALENDAR_TZ, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }
        )}.`,
        data: event,
      };
    },
  },

  {
    id: 'delete-event',
    moduleId: MODULE_ID,
    name: 'Delete Event',
    description: 'Delete a calendar event by ID',
    examples: ['Remove my 2pm meeting', 'Cancel the dentist appointment'],
    parameters: [
      {
        name: 'id',
        type: 'string',
        description: 'Event ID to delete',
        required: true,
      },
    ],
    async execute(params): Promise<ActionResult> {
      const id = params.id as string;
      if (!id) return { success: false, message: 'Event ID is required.' };
      await calendarAdapter.deleteEvent(id);
      return { success: true, message: `Event deleted.` };
    },
  },
];
