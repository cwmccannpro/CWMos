import { BudgetSnapshotWidget, InvestingSnapshotWidget, FinanceOverviewWidget } from './widgets';
import type { ModuleDefinition } from '@/types';

export const financeModule: ModuleDefinition = {
  metadata: {
    id: 'finance',
    name: 'Finance',
    description: 'Budget tracking, income management, and investment portfolio',
    icon: 'TrendingUp',
    version: '1.0.0',
  },
  routes: [
    { path: '/finance',           label: 'Overview',   icon: 'TrendingUp' },
    { path: '/finance/budget',    label: 'Budget',     icon: 'Wallet' },
    { path: '/finance/investing', label: 'Investing',  icon: 'BarChart2' },
  ],
  widgets: [
    {
      id: 'finance-overview',
      moduleId: 'finance',
      name: 'Finance Overview',
      description: 'Income vs spending at a glance',
      defaultSize: { w: 4, h: 3 },
      minSize: { w: 3, h: 2 },
      component: FinanceOverviewWidget,
    },
    {
      id: 'budget-snapshot',
      moduleId: 'finance',
      name: 'Budget Snapshot',
      description: 'Monthly budget vs actual by category',
      defaultSize: { w: 3, h: 4 },
      minSize: { w: 2, h: 3 },
      component: BudgetSnapshotWidget,
    },
    {
      id: 'investing-snapshot',
      moduleId: 'finance',
      name: 'Portfolio Snapshot',
      description: 'Investment holdings with live prices',
      defaultSize: { w: 3, h: 4 },
      minSize: { w: 2, h: 3 },
      component: InvestingSnapshotWidget,
    },
  ],
  actions: [],
  permissions: [],
};
