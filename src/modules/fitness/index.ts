import { HealthFitnessWidget } from '@/modules/health/widgets';
import type { ModuleDefinition } from '@/types';

export const fitnessModule: ModuleDefinition = {
  metadata: {
    id: 'fitness',
    name: 'Fitness',
    description: 'PPL workout schedule and exercise tracking',
    icon: 'Dumbbell',
    version: '1.0.0',
  },
  routes: [
    { path: '/fitness', label: 'Fitness', icon: 'Dumbbell' },
  ],
  widgets: [
    {
      id: 'health-fitness',
      moduleId: 'fitness',
      name: "Today's Workout",
      description: "Today's workout type and exercises",
      defaultSize: { w: 3, h: 5 },
      minSize: { w: 2, h: 3 },
      component: HealthFitnessWidget,
    },
  ],
  actions: [],
  permissions: [],
};
