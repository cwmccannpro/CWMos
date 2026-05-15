/**
 * Module bootstrap — registers all modules into the shared registry.
 *
 * Import this file once at the application boundary (root layout or API handler).
 * Side effects run at import time via module-level code, so the registry is
 * populated the moment this file is imported.
 *
 * To add a new module: import it here and call registry.register().
 */
import { registry } from './registry';
import { calendarModule } from '@/modules/calendar';
import { trelloModule } from '@/modules/trello';
import { habitTrackerModule } from '@/modules/habit-tracker';
import { agentManagerModule } from '@/modules/agent-manager';
import { viridianSystemsModule } from '@/modules/viridian-systems';
import { contentFactoryModule } from '@/modules/content-factory';
import { knowledgeDatabaseModule } from '@/modules/knowledge-database';

registry.register(calendarModule);
registry.register(trelloModule);
registry.register(habitTrackerModule);
registry.register(agentManagerModule);
registry.register(viridianSystemsModule);
registry.register(contentFactoryModule);
registry.register(knowledgeDatabaseModule);

export { registry };
