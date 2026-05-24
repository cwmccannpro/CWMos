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

const ID_MIGRATIONS: Record<string, string> = {
  'trello-recent-cards': 'trello-list',
};

function normalizeLayout(raw: WidgetLayoutItem[]): WidgetLayoutItem[] {
  return raw.map((item) => ({
    ...item,
    config: item.config ?? {},
    definitionId: ID_MIGRATIONS[item.definitionId] ?? item.definitionId,
  }));
}

function localLoad(): WidgetLayoutItem[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return normalizeLayout(JSON.parse(stored) as WidgetLayoutItem[]);
  } catch { return null; }
}

function localSave(items: WidgetLayoutItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function cloudSave(items: WidgetLayoutItem[]) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch('/api/dashboard-layout', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout: items }),
    }).catch(() => { /* non-fatal */ });
  }, 1500);
}

export function Dashboard() {
  const [items, setItems] = useState<WidgetLayoutItem[]>([]);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Show localStorage immediately, then sync from cloud
    const local = localLoad();
    if (local) setItems(local);
    setMounted(true);

    fetch('/api/dashboard-layout')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.layout && Array.isArray(data.layout) && data.layout.length > 0) {
          // Cloud has a saved layout — it's the source of truth
          const normalized = normalizeLayout(data.layout as WidgetLayoutItem[]);
          setItems(normalized);
          localSave(normalized);
        } else if (local && local.length > 0) {
          // Cloud is empty but localStorage has a layout — push it up
          cloudSave(local);
        } else {
          // Nothing anywhere — generate defaults and save everywhere
          const def = getDefaultLayout();
          setItems(def);
          localSave(def);
          cloudSave(def);
        }
      })
      .catch(() => { if (!local) setItems(getDefaultLayout()); });
  }, []);

  const persist = useCallback((items: WidgetLayoutItem[]) => {
    localSave(items);
    cloudSave(items);
  }, []);

  const handleLayoutChange = useCallback((updated: WidgetLayoutItem[]) => {
    setItems(updated);
    persist(updated);
  }, [persist]);

  const handleRemoveWidget = useCallback((instanceId: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.instanceId !== instanceId);
      persist(next);
      return next;
    });
  }, [persist]);

  const handleConfigChange = useCallback((instanceId: string, config: Record<string, unknown>) => {
    setItems((prev) => {
      const next = prev.map((item) =>
        item.instanceId === instanceId ? { ...item, config } : item
      );
      persist(next);
      return next;
    });
  }, [persist]);

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
      persist(next);
      return next;
    });
    setAddMenuOpen(false);
  }, [persist]);

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
        <h1
          className="uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            color: 'rgba(0,212,255,0.35)',
          }}
        >
          Dashboard
        </h1>

        <div className="relative">
          <button
            onClick={() => setAddMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              letterSpacing: '0.08em',
              color: '#00D4FF',
              border: '1px solid rgba(0,212,255,0.25)',
              background: 'rgba(0,212,255,0.04)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,255,0.1)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,255,0.5)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 14px rgba(0,212,255,0.18)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,255,0.04)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,255,0.25)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <Plus size={12} />
            + MODULE
          </button>

          {addMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAddMenuOpen(false)} />
              <div
                className="absolute right-0 mt-1 z-20 w-64 rounded-xl shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto"
                style={{
                  background: 'rgba(8,12,20,0.97)',
                  border: '1px solid rgba(0,212,255,0.15)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                {availableWidgets.length === 0 ? (
                  <p className="px-3 py-2 text-zinc-500 text-xs">No widgets available</p>
                ) : (
                  Object.entries(widgetsByModule).map(([moduleId, defs]) => (
                    <div key={moduleId}>
                      <div className="px-3 pt-3 pb-1.5">
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.55rem',
                          letterSpacing: '0.18em',
                          color: 'rgba(0,212,255,0.4)',
                          textTransform: 'uppercase',
                        }}>
                          {moduleId}
                        </span>
                      </div>
                      {defs.map((def) => (
                        <button
                          key={`${def.moduleId}/${def.id}`}
                          onClick={() => handleAddWidget(def)}
                          className="w-full flex flex-col items-start px-3 py-2.5 transition-all duration-150"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,255,0.05)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                        >
                          <span className="text-zinc-200 text-xs">{def.name}</span>
                          <span className="text-[10px]" style={{ color: 'rgba(160,175,200,0.4)' }}>{def.description}</span>
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
