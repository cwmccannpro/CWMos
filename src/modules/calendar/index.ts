import { CalendarUpcomingWidget, CalendarDayWidget, CalendarWeekWidget } from './widgets';
import { calendarActions } from './actions';
import type { ModuleDefinition } from '@/types';

export const calendarModule: ModuleDefinition = {
  metadata: {
    id: 'calendar',
    name: 'Calendar',
    description: 'View and manage calendar events',
    icon: 'CalendarDays',
    version: '1.0.0',
  },
  routes: [
    { path: '/calendar', label: 'Calendar', icon: 'CalendarDays' },
  ],
  widgets: [
    {
      id: 'calendar-upcoming',
      moduleId: 'calendar',
      name: 'Upcoming Events',
      description: 'Next 7 days at a glance',
      defaultSize: { w: 3, h: 4 },
      minSize: { w: 2, h: 3 },
      component: CalendarUpcomingWidget,
    },
    {
      id: 'calendar-day',
      moduleId: 'calendar',
      name: "Today's Schedule",
      description: "All of today's events in order",
      defaultSize: { w: 3, h: 5 },
      minSize: { w: 2, h: 3 },
      component: CalendarDayWidget,
    },
    {
      id: 'calendar-week',
      moduleId: 'calendar',
      name: 'Week View',
      description: 'Current week time grid',
      defaultSize: { w: 8, h: 9 },
      minSize: { w: 5, h: 6 },
      noPadding: true,
      component: CalendarWeekWidget,
    },
  ],
  actions: calendarActions,
  permissions: ['calendar:read', 'calendar:write'],
};
