import { HealthSupplementWidget, SupplementAnalyticsWidget } from './widgets';
import type { ModuleDefinition } from '@/types';

export const supplementsModule: ModuleDefinition = {
  metadata: {
    id: 'supplements',
    name: 'Supplements',
    description: 'Daily supplement schedule and tracking',
    icon: 'Pill',
    version: '1.0.0',
  },
  routes: [
    { path: '/supplements', label: 'Supplements', icon: 'Pill' },
  ],
  widgets: [
    {
      id: 'health-supplements',
      moduleId: 'supplements',
      name: 'Supplements',
      description: "Today's supplement checklist",
      defaultSize: { w: 3, h: 5 },
      minSize: { w: 2, h: 3 },
      component: HealthSupplementWidget,
    },
    {
      id: 'supplement-analytics',
      moduleId: 'supplements',
      name: 'Supplement Analytics',
      description: '14-day adherence heatmap, streak, and daily checklist',
      defaultSize: { w: 3, h: 7 },
      minSize: { w: 2, h: 5 },
      component: SupplementAnalyticsWidget,
    },
  ],
  actions: [],
  permissions: [],
};
