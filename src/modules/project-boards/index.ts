import type { ModuleDefinition } from '@/types';

export const projectBoardsModule: ModuleDefinition = {
  metadata: {
    id: 'project-boards',
    name: 'Project Boards',
    description: 'Kanban boards for managing projects with drag-and-drop cards',
    icon: 'LayoutDashboard',
    version: '1.0.0',
  },
  routes: [
    { path: '/project-boards', label: 'Project Boards', icon: 'LayoutDashboard' },
  ],
  widgets: [],
  actions: [],
  permissions: [],
};
