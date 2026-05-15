import { HabitTodayWidget, HabitTodaySettings, HabitAnalyticsWidget, HabitAnalyticsSettings } from './widgets';
import type { ModuleDefinition } from '@/types';

export const habitTrackerModule: ModuleDefinition = {
  metadata: {
    id: 'habit-tracker',
    name: 'Habit Tracker',
    description: 'Track daily habits across multiple people with history and graphs',
    icon: 'Target',
    version: '1.0.0',
  },
  routes: [
    { path: '/habit-tracker', label: 'Habit Tracker', icon: 'Target' },
  ],
  widgets: [
    {
      id: 'habit-today',
      moduleId: 'habit-tracker',
      name: "Today's Habits",
      description: 'Check off daily habits from the dashboard',
      defaultSize: { w: 3, h: 5 },
      minSize: { w: 2, h: 3 },
      component: HabitTodayWidget,
      settingsComponent: HabitTodaySettings,
    },
    {
      id: 'habit-analytics',
      moduleId: 'habit-tracker',
      name: 'Habit Analytics',
      description: 'Streaks, weekly grid, or monthly heatmap',
      defaultSize: { w: 4, h: 6 },
      minSize: { w: 3, h: 4 },
      component: HabitAnalyticsWidget,
      settingsComponent: HabitAnalyticsSettings,
    },
  ],
  actions: [],
  permissions: ['habit-tracker:read', 'habit-tracker:write'],
};
