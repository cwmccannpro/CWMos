'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MasterController } from '@/components/master-controller/MasterController';

// Bootstrap registers all modules into the registry on first import.
// Importing here ensures modules are available on every client page load.
import '@/lib/modules';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mcOpen, setMcOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        onOpenMasterController={() => setMcOpen(true)}
      />

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      <MasterController open={mcOpen} onClose={() => setMcOpen(false)} />
    </div>
  );
}
