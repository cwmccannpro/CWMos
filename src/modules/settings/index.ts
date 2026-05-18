import type { ModuleDefinition } from '@/types';

export const settingsModule: ModuleDefinition = {
  metadata: {
    id: 'settings',
    name: 'Settings',
    description: 'Manage integrations and account preferences',
    icon: 'Settings2',
    version: '1.0.0',
  },
  routes: [
    { path: '/settings', label: 'Settings', icon: 'Settings2' },
  ],
  widgets: [],
  actions: [],
  permissions: [],
};
