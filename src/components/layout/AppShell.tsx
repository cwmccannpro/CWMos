'use client';

import { useState } from 'react';
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
        onOpenMasterController={() => setMcOpen(true)}
      />

      {/* Main content with radial glow */}
      <main
        className="flex-1 overflow-y-auto relative"
        style={{
          background: 'radial-gradient(ellipse 90% 55% at 50% 35%, rgba(0,25,55,0.45) 0%, transparent 70%), #080B10',
        }}
      >
        {children}
      </main>

      <MasterController open={mcOpen} onClose={() => setMcOpen(false)} />
    </div>
  );
}
