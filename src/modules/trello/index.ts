import { TrelloListWidget, TrelloListSettings } from './widgets';
import { trelloActions } from './actions';
import type { ModuleDefinition } from '@/types';

export const trelloModule: ModuleDefinition = {
  metadata: {
    id: 'trello',
    name: 'Trello',
    description: 'View and manage Trello boards and cards',
    icon: 'LayoutDashboard',
    version: '1.0.0',
  },
  routes: [
    { path: '/trello', label: 'Trello', icon: 'LayoutDashboard' },
  ],
  widgets: [
    {
      id: 'trello-list',
      moduleId: 'trello',
      name: 'Trello Board',
      description: 'Cards from a chosen board and lists',
      defaultSize: { w: 3, h: 5 },
      minSize: { w: 2, h: 3 },
      component: TrelloListWidget,
      settingsComponent: TrelloListSettings,
    },
  ],
  actions: trelloActions,
  permissions: ['trello:read', 'trello:write'],
};
