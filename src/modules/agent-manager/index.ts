import type { ModuleDefinition } from '@/types';

export const agentManagerModule: ModuleDefinition = {
  metadata: {
    id: 'agent-manager',
    name: 'Agent Manager',
    description: 'Monitor and manage running AI agents and their activity',
    icon: 'Bot',
    version: '1.0.0',
  },
  routes: [
    {
      path: '/agent-manager',
      label: 'Agent Manager',
      icon: 'Bot',
    },
  ],
  widgets: [],
  actions: [],
  permissions: ['agent-manager:read', 'agent-manager:write'],
};
