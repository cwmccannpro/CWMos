'use client';

import { useState } from 'react';
import { Bot } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { MasterController } from '@/components/master-controller/MasterController';
import '@/lib/modules';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mcOpen, setMcOpen] = useState(false);

  return (
    <div
      className="flex h-screen w-screen overflow-hidden text-zinc-100"
      style={{ background: '#080B10' }}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      {/* Main content with radial glow */}
      <main
        className="flex-1 overflow-hidden flex flex-col"
        style={{
          background: 'radial-gradient(ellipse 90% 55% at 50% 35%, rgba(0,25,55,0.45) 0%, transparent 70%), #080B10',
        }}
      >
        {/* Top bar — MC button lives here so it never overlaps page content */}
        <div className="flex items-center justify-end px-4 shrink-0" style={{ height: '44px', borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
          <button
            onClick={() => setMcOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl animate-glow-pulse transition-all"
            style={{
              color: '#00D4FF',
              border: '1px solid rgba(0,212,255,0.22)',
              background: 'rgba(0,212,255,0.04)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,255,0.1)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,255,0.45)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,255,0.04)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,255,0.22)';
            }}
            aria-label="Open Master Controller"
          >
            <Bot size={13} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.1em' }}>
              MASTER CTRL
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      <MasterController open={mcOpen} onClose={() => setMcOpen(false)} />
    </div>
  );
}
