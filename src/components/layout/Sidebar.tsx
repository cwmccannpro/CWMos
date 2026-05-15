'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  CalendarDays,
  LayoutDashboard,
  Bot,
  ChevronLeft,
  ChevronRight,
  Leaf,
  BarChart3,
  Target,
  HeartPulse,
  UtensilsCrossed,
  Pill,
  Dumbbell,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { registry } from '@/lib/registry';

// Map icon name strings (stored in module definitions) to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid,
  CalendarDays,
  LayoutDashboard,
  Bot,
  Leaf,
  BarChart3,
  Target,
  HeartPulse,
  UtensilsCrossed,
  Pill,
  Dumbbell,
};

function NavIcon({ name, size = 18 }: { name?: string; size?: number }) {
  const Icon = name ? ICON_MAP[name] : null;
  if (!Icon) return <span className="w-[18px]" />;
  return <Icon size={size} />;
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMasterController: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, onOpenMasterController }: SidebarProps) {
  const pathname = usePathname();

  // Build nav from registered modules — Dashboard is always first
  const moduleNavItems = registry.getAllModules().flatMap((mod) =>
    mod.routes.map((route) => ({
      href: route.path,
      label: route.label,
      icon: route.icon,
    }))
  );

  const navItems = [
    { href: '/', label: 'Dashboard', icon: 'LayoutGrid' },
    ...moduleNavItems,
  ];

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-zinc-900 border-r border-zinc-800 transition-all duration-200',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Logo / brand */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-zinc-800 shrink-0">
        {!collapsed && (
          <span className="text-zinc-100 font-semibold text-sm tracking-tight truncate">
            CWM Control
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors ml-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className="shrink-0">
                <NavIcon name={item.icon} />
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Master Controller button */}
      <div className="px-2 pb-4 shrink-0">
        <button
          onClick={onOpenMasterController}
          className={cn(
            'flex items-center gap-3 w-full px-2 py-2 rounded-md text-sm transition-colors',
            'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          )}
          title={collapsed ? 'Master Controller' : undefined}
        >
          <span className="shrink-0">
            <Bot size={18} />
          </span>
          {!collapsed && <span className="truncate">Master Controller</span>}
        </button>
      </div>
    </aside>
  );
}
