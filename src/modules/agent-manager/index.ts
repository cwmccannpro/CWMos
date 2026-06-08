import { MasterControllerWidget } from './widgets';
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
  widgets: [
    {
      id: 'master-controller',
      moduleId: 'agent-manager',
      name: 'Master Controller',
      description: 'Inline AI chat for calendar, habits, and more',
      defaultSize: { w: 4, h: 6 },
      minSize: { w: 3, h: 4 },
      component: MasterControllerWidget,
    },
  ],
  actions: [],
  permissions: ['agent-manager:read', 'agent-manager:write'],
};
