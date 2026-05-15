'use client';

import { useCallback } from 'react';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

import { registry } from '@/lib/registry';
import { WidgetWrapper } from './WidgetWrapper';
import type { WidgetLayoutItem, WidgetSettingsProps } from '@/types';

const ResponsiveGrid = WidthProvider(GridLayout);

interface DashboardGridProps {
  items: WidgetLayoutItem[];
  onLayoutChange: (items: WidgetLayoutItem[]) => void;
  onRemoveWidget: (instanceId: string) => void;
  onConfigChange: (instanceId: string, config: Record<string, unknown>) => void;
}

export function DashboardGrid({ items, onLayoutChange, onRemoveWidget, onConfigChange }: DashboardGridProps) {
  const handleLayoutChange = useCallback(
    (layout: GridLayout.Layout[]) => {
      const updated: WidgetLayoutItem[] = layout.map((l) => {
        const existing = items.find((item) => item.instanceId === l.i);
        return {
          instanceId: l.i,
          definitionId: existing?.definitionId ?? '',
          moduleId: existing?.moduleId ?? '',
          config: existing?.config ?? {},
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h,
        };
      });
      onLayoutChange(updated);
    },
    [items, onLayoutChange]
  );

  const gridLayout: GridLayout.Layout[] = items.map((item) => ({
    i: item.instanceId,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: registry.getWidget(item.moduleId, item.definitionId)?.minSize?.w,
    minH: registry.getWidget(item.moduleId, item.definitionId)?.minSize?.h,
    maxW: registry.getWidget(item.moduleId, item.definitionId)?.maxSize?.w,
    maxH: registry.getWidget(item.moduleId, item.definitionId)?.maxSize?.h,
  }));

  return (
    <ResponsiveGrid
      layout={gridLayout}
      cols={12}
      rowHeight={60}
      margin={[12, 12]}
      draggableHandle=".drag-handle"
      onLayoutChange={handleLayoutChange}
      className="w-full"
    >
      {items.map((item) => {
        const definition = registry.getWidget(item.moduleId, item.definitionId);
        const config = item.config ?? {};

        if (!definition) {
          return (
            <div key={item.instanceId}>
              <WidgetWrapper title="Unknown Widget" onRemove={() => onRemoveWidget(item.instanceId)}>
                <p className="text-zinc-500 text-sm">Widget definition not found.</p>
              </WidgetWrapper>
            </div>
          );
        }

        const WidgetComponent = definition.component;
        const SettingsComponent = definition.settingsComponent as
          | React.ComponentType<WidgetSettingsProps>
          | undefined;

        const settingsContent = SettingsComponent ? (
          <SettingsComponent
            config={config}
            onConfigChange={(c) => onConfigChange(item.instanceId, c)}
          />
        ) : undefined;

        return (
          <div key={item.instanceId}>
            <WidgetWrapper
              title={definition.name}
              onRemove={() => onRemoveWidget(item.instanceId)}
              settingsContent={settingsContent}
              noPadding={definition.noPadding}
            >
              <WidgetComponent
                widgetInstanceId={item.instanceId}
                moduleId={item.moduleId}
                config={config}
              />
            </WidgetWrapper>
          </div>
        );
      })}
    </ResponsiveGrid>
  );
}
