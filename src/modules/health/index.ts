import { HealthSupplementWidget, HealthFitnessWidget } from './widgets';
import type { ModuleDefinition } from '@/types';

export const healthModule: ModuleDefinition = {
  metadata: {
    id: 'health',
    name: 'Health',
    description: 'Supplement schedule and fitness tracker',
    icon: 'HeartPulse',
    version: '1.0.0',
  },
  routes: [
    { path: '/health', label: 'Health', icon: 'HeartPulse' },
  ],
  widgets: [
    {
      id: 'health-supplements',
      moduleId: 'health',
      name: 'Supplements',
      description: "Today's supplement checklist",
      defaultSize: { w: 3, h: 5 },
      minSize: { w: 2, h: 3 },
      component: HealthSupplementWidget,
    },
    {
      id: 'health-fitness',
      moduleId: 'health',
      name: "Today's Workout",
      description: "Today's workout type and exercises",
      defaultSize: { w: 3, h: 5 },
      minSize: { w: 2, h: 3 },
      component: HealthFitnessWidget,
    },
  ],
  actions: [],
  permissions: ['habit-tracker:read', 'habit-tracker:write'],
};
