'use client';

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus } from 'lucide-react';
import { DashboardGrid } from './DashboardGrid';
import { registry } from '@/lib/registry';
import type { WidgetLayoutItem, WidgetDefinition } from '@/types';

const STORAGE_KEY = 'cwm-dashboard-layout';

function getDefaultLayout(): WidgetLayoutItem[] {
  const widgets = registry.getAllWidgets();
  return widgets.map((def, i) => ({
    instanceId: uuidv4(),
    definitionId: def.id,
    moduleId: def.moduleId,
    x: (i * 3) % 12,
    y: Math.floor(i / 4) * 4,
    w: def.defaultSize.w,
    h: def.defaultSize.h,
    config: {},
  }));
}

// Renames for widget IDs that changed across versions
const ID_MIGRATIONS: Record<string, string> = {
  'trello-recent-cards': 'trello-list',
};

function loadLayout(): WidgetLayoutItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultLayout();
    const parsed = JSON.parse(stored) as WidgetLayoutItem[];
    return parsed.map((item) => ({
      ...item,
      config: item.config ?? {},
      definitionId: ID_MIGRATIONS[item.definitionId] ?? item.definitionId,
    }));
  } catch {
    return getDefaultLayout();
  }
}

function saveLayout(items: WidgetLayoutItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function Dashboard() {
  const [items, setItems] = useState<WidgetLayoutItem[]>([]);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(loadLayout());
    setMounted(true);
  }, []);

  const handleLayoutChange = useCallback((updated: WidgetLayoutItem[]) => {
    setItems(updated);
    saveLayout(updated);
  }, []);

  const handleRemoveWidget = useCallback((instanceId: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.instanceId !== instanceId);
      saveLayout(next);
      return next;
    });
  }, []);

  const handleConfigChange = useCallback((instanceId: string, config: Record<string, unknown>) => {
    setItems((prev) => {
      const next = prev.map((item) =>
        item.instanceId === instanceId ? { ...item, config } : item
      );
      saveLayout(next);
      return next;
    });
  }, []);

  const handleAddWidget = useCallback((def: WidgetDefinition) => {
    const newItem: WidgetLayoutItem = {
      instanceId: uuidv4(),
      definitionId: def.id,
      moduleId: def.moduleId,
      x: 0,
      y: Infinity,
      w: def.defaultSize.w,
      h: def.defaultSize.h,
      config: {},
    };
    setItems((prev) => {
      const next = [...prev, newItem];
      saveLayout(next);
      return next;
    });
    setAddMenuOpen(false);
  }, []);

  const availableWidgets = registry.getAllWidgets();

  // Group widgets by module for display
  const widgetsByModule = availableWidgets.reduce<Record<string, WidgetDefinition[]>>((acc, def) => {
    const group = acc[def.moduleId] ?? [];
    group.push(def);
    acc[def.moduleId] = group;
    return acc;
  }, {});

  if (!mounted) {
    return (
      <div className="p-6">
        <div className="h-64 flex items-center justify-center text-zinc-600 text-sm">
          Loading dashboard…
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-zinc-100 text-lg font-semibold">Dashboard</h1>

        <div className="relative">
          <button
            onClick={() => setAddMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
          >
            <Plus size={14} />
            Add widget
          </button>

          {addMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAddMenuOpen(false)} />
              <div className="absolute right-0 mt-1 z-20 w-64 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden max-h-[70vh] overflow-y-auto">
                {availableWidgets.length === 0 ? (
                  <p className="px-3 py-2 text-zinc-500 text-sm">No widgets available</p>
                ) : (
                  Object.entries(widgetsByModule).map(([moduleId, defs]) => (
                    <div key={moduleId}>
                      <div className="px-3 pt-2.5 pb-1">
                        <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold">
                          {moduleId}
                        </span>
                      </div>
                      {defs.map((def) => (
                        <button
                          key={`${def.moduleId}/${def.id}`}
                          onClick={() => handleAddWidget(def)}
                          className="w-full flex flex-col items-start px-3 py-2 text-sm hover:bg-zinc-700 transition-colors"
                        >
                          <span className="text-zinc-200 font-medium">{def.name}</span>
                          <span className="text-zinc-500 text-xs">{def.description}</span>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-72 text-center">
          <p className="text-zinc-500 text-sm">Your dashboard is empty.</p>
          <p className="text-zinc-600 text-xs mt-1">Click &quot;Add widget&quot; to get started.</p>
        </div>
      ) : (
        <DashboardGrid
          items={items}
          onLayoutChange={handleLayoutChange}
          onRemoveWidget={handleRemoveWidget}
          onConfigChange={handleConfigChange}
        />
      )}
    </div>
  );
}
