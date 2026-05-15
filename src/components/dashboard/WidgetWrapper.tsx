'use client';

import { useState } from 'react';
import { X, GripVertical, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetWrapperProps {
  title: string;
  onRemove: () => void;
  children: React.ReactNode;
  settingsContent?: React.ReactNode;
  noPadding?: boolean;
  className?: string;
}

export function WidgetWrapper({
  title,
  onRemove,
  children,
  settingsContent,
  noPadding,
  className,
}: WidgetWrapperProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden',
        className
      )}
    >
      {/* Widget header */}
      <div className="drag-handle flex items-center justify-between px-3 py-2 border-b border-zinc-800 cursor-grab active:cursor-grabbing shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical size={14} className="text-zinc-600 shrink-0" />
          <span className="text-zinc-400 text-xs font-medium truncate">{title}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {settingsContent && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setSettingsOpen((o) => !o)}
              className={cn(
                'p-1 rounded transition-colors',
                settingsOpen
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800'
              )}
              aria-label="Widget settings"
            >
              <Settings size={11} />
            </button>
          )}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onRemove}
            className="p-1 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            aria-label={`Remove ${title} widget`}
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Settings panel (slides in below header) */}
      {settingsContent && settingsOpen && (
        <div className="border-b border-zinc-800 bg-zinc-950/70 px-3 py-2.5 shrink-0">
          {settingsContent}
        </div>
      )}

      {/* Widget content */}
      <div className={cn('flex-1 overflow-hidden', !noPadding && 'p-3')}>
        {children}
      </div>
    </div>
  );
}
