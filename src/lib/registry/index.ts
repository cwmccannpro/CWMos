import type {
  ModuleDefinition,
  ModuleId,
  ModuleAction,
  WidgetDefinition,
} from '@/types';

/**
 * ModuleRegistry is the central catalog of all registered modules.
 *
 * Modules self-register by calling `registry.register(definition)` from their
 * index file. The registry is a module-level singleton so it is shared across
 * all imports within a single JS runtime (server or client).
 */
class ModuleRegistry {
  private modules = new Map<ModuleId, ModuleDefinition>();

  register(module: ModuleDefinition): void {
    if (this.modules.has(module.metadata.id)) {
      console.warn(
        `[Registry] Module "${module.metadata.id}" is already registered. Skipping duplicate.`
      );
      return;
    }
    this.modules.set(module.metadata.id, module);
    console.info(`[Registry] Registered module: ${module.metadata.name}`);
  }

  getModule(id: ModuleId): ModuleDefinition | undefined {
    return this.modules.get(id);
  }

  getAllModules(): ModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  getAllActions(): ModuleAction[] {
    return this.getAllModules().flatMap((m) => m.actions);
  }

  getAllWidgets(): WidgetDefinition[] {
    return this.getAllModules().flatMap((m) => m.widgets);
  }

  getAction(moduleId: ModuleId, actionId: string): ModuleAction | undefined {
    return this.getModule(moduleId)?.actions.find((a) => a.id === actionId);
  }

  getWidget(moduleId: ModuleId, widgetId: string): WidgetDefinition | undefined {
    return this.getModule(moduleId)?.widgets.find((w) => w.id === widgetId);
  }

  isRegistered(id: ModuleId): boolean {
    return this.modules.has(id);
  }
}

export const registry = new ModuleRegistry();
