import { ProjectBoardWidget, ProjectBoardSettings } from './widgets';
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
  widgets: [
    {
      id: 'project-board',
      moduleId: 'project-boards',
      name: 'Project Board',
      description: 'Compact view of a project board — columns with their cards',
      defaultSize: { w: 4, h: 6 },
      minSize: { w: 2, h: 4 },
      component: ProjectBoardWidget,
      settingsComponent: ProjectBoardSettings,
    },
  ],
  actions: [],
  permissions: [],
};
