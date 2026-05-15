import type { ModuleDefinition } from '@/types';

export const contentFactoryModule: ModuleDefinition = {
  metadata: {
    id: 'content-factory',
    name: 'Content Factory',
    description: 'Unified analytics across all content platforms and channels',
    icon: 'BarChart3',
    version: '1.0.0',
  },
  routes: [
    {
      path: '/content-factory',
      label: 'Content Factory',
      icon: 'BarChart3',
    },
  ],
  widgets: [],
  actions: [],
  permissions: ['content-factory:read'],
};
