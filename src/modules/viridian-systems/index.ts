import type { ModuleDefinition } from '@/types';

export const viridianSystemsModule: ModuleDefinition = {
  metadata: {
    id: 'viridian-systems',
    name: 'Viridian Systems',
    description: 'Project hub for Viridian Systems operations and documentation',
    icon: 'Leaf',
    version: '1.0.0',
  },
  routes: [
    {
      path: '/viridian-systems',
      label: 'Viridian Systems',
      icon: 'Leaf',
    },
  ],
  widgets: [],
  actions: [],
  permissions: ['viridian-systems:read'],
};
