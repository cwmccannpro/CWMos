'use client';

import { useState } from 'react';
import { X, Settings } from 'lucide-react';
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
  title, onRemove, children, settingsContent, noPadding, className,
}: WidgetWrapperProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={cn('flex flex-col h-full rounded-xl overflow-hidden', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(8, 12, 20, 0.92)',
        border: hovered
          ? '1px solid rgba(0,212,255,0.28)'
          : '1px solid rgba(0,212,255,0.09)',
        borderTop: hovered
          ? '1px solid rgba(0,212,255,0.42)'
          : '1px solid rgba(0,212,255,0.2)',
        boxShadow: hovered
          ? '0 0 28px rgba(0,212,255,0.07), 0 8px 32px rgba(0,0,0,0.5)'
          : '0 0 18px rgba(0,212,255,0.03), 0 4px 20px rgba(0,0,0,0.4)',
        transform: hovered ? 'scale(1.005)' : 'scale(1)',
        transition: 'border 200ms ease, box-shadow 200ms ease, transform 150ms ease',
      }}
    >
      {/* Header */}
      <div
        className="drag-handle flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing shrink-0"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.07)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Braille drag dots */}
          <span
            className="shrink-0 select-none"
            style={{
              color: hovered ? 'rgba(0,212,255,0.45)' : 'rgba(255,255,255,0.1)',
              fontSize: '11px',
              lineHeight: 1,
              transition: 'color 200ms ease',
            }}
          >
            ⠿
          </span>
          <span
            className="truncate uppercase"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.58rem',
              letterSpacing: '0.14em',
              color: hovered ? 'rgba(0,212,255,0.6)' : 'rgba(160,175,200,0.38)',
              transition: 'color 200ms ease',
            }}
          >
            {title}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {settingsContent && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setSettingsOpen(o => !o)}
              className="p-1 rounded transition-all duration-150"
              style={{ color: settingsOpen ? '#00D4FF' : 'rgba(255,255,255,0.18)' }}
              onMouseEnter={e => { if (!settingsOpen) (e.currentTarget as HTMLElement).style.color = 'rgba(0,212,255,0.7)'; }}
              onMouseLeave={e => { if (!settingsOpen) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.18)'; }}
              aria-label="Widget settings"
            >
              <Settings size={10} />
            </button>
          )}
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onRemove}
            className="p-1 rounded transition-all duration-150"
            style={{ color: 'rgba(255,255,255,0.12)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f87171'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.12)'}
            aria-label={`Remove ${title}`}
          >
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {settingsContent && settingsOpen && (
        <div
          className="px-3 py-2.5 shrink-0"
          style={{
            borderBottom: '1px solid rgba(0,212,255,0.07)',
            background: 'rgba(0,212,255,0.02)',
          }}
        >
          {settingsContent}
        </div>
      )}

      {/* Content */}
      <div className={cn('flex-1 overflow-hidden', !noPadding && 'p-3')}>
        {children}
      </div>
    </div>
  );
}
