import { NutritionTodayWidget, NutritionWeekWidget } from './widgets';
import type { ModuleDefinition } from '@/types';

export const nutritionModule: ModuleDefinition = {
  metadata: {
    id: 'nutrition',
    name: 'Nutrition',
    description: 'Meal logging via ChatGPT Action with calorie and macro tracking',
    icon: 'UtensilsCrossed',
    version: '1.0.0',
  },
  routes: [
    { path: '/nutrition', label: 'Nutrition', icon: 'UtensilsCrossed' },
  ],
  widgets: [
    {
      id: 'nutrition-today',
      moduleId: 'nutrition',
      name: "Today's Nutrition",
      description: 'Calories + macro rings for today',
      defaultSize: { w: 3, h: 5 },
      minSize: { w: 2, h: 4 },
      component: NutritionTodayWidget,
    },
    {
      id: 'nutrition-week',
      moduleId: 'nutrition',
      name: '7-Day Nutrition',
      description: 'Weekly averages vs daily goals',
      defaultSize: { w: 3, h: 4 },
      minSize: { w: 2, h: 3 },
      component: NutritionWeekWidget,
    },
  ],
  actions: [],
  permissions: ['habit-tracker:read'],
};
