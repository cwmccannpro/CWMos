import { registry } from './registry';
import { calendarModule } from '@/modules/calendar';
import { trelloModule } from '@/modules/trello';
import { nutritionModule } from '@/modules/nutrition';
import { supplementsModule } from '@/modules/supplements';
import { fitnessModule } from '@/modules/fitness';
import { habitTrackerModule } from '@/modules/habit-tracker';
import { agentManagerModule } from '@/modules/agent-manager';
import { viridianSystemsModule } from '@/modules/viridian-systems';
import { contentFactoryModule } from '@/modules/content-factory';
import { settingsModule } from '@/modules/settings';

registry.register(calendarModule);
registry.register(trelloModule);
registry.register(nutritionModule);
registry.register(supplementsModule);
registry.register(fitnessModule);
registry.register(habitTrackerModule);
registry.register(agentManagerModule);
registry.register(viridianSystemsModule);
registry.register(contentFactoryModule);
registry.register(settingsModule);

export { registry };
