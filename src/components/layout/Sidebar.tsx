'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid, CalendarDays, LayoutDashboard, ChevronLeft, ChevronRight, ChevronDown,
  Leaf, BarChart3, Target, HeartPulse, UtensilsCrossed, Pill, Dumbbell,
  TrendingUp, Wallet, BarChart2,
  Settings2, LogOut, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { registry } from '@/lib/registry';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useCallback } from 'react';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid, CalendarDays, LayoutDashboard, Leaf, BarChart3, Target,
  HeartPulse, UtensilsCrossed, Pill, Dumbbell, Settings2,
  TrendingUp, Wallet, BarChart2,
};

// Sidebar group definitions — paths that belong together under a collapsible header
const NAV_GROUPS: { id: string; label: string; paths: string[] }[] = [
  { id: 'projects', label: 'Projects', paths: ['/viridian-systems', '/content-factory'] },
  { id: 'health',   label: 'Health',   paths: ['/fitness', '/nutrition', '/supplements'] },
  { id: 'finance',  label: 'Finance',  paths: ['/finance', '/finance/budget', '/finance/investing'] },
];

// Paths rendered in the bottom bar instead of the main nav
const BOTTOM_NAV_PATHS = new Set(['/settings']);

function NavIcon({ name, size = 15 }: { name?: string; size?: number }) {
  const Icon = name ? ICON_MAP[name] : null;
  if (!Icon) return <span className="w-[15px]" />;
  return <Icon size={size} />;
}

function NavLink({ href, label, icon, collapsed, active }: {
  href: string; label: string; icon?: string; collapsed: boolean; active: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className="relative flex items-center gap-3 px-2 py-1.5 rounded-md transition-all duration-200"
      style={active ? { color: '#00D4FF', background: 'rgba(0,212,255,0.06)' } : { color: 'rgba(160,175,200,0.45)' }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = 'rgba(220,235,255,0.85)';
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = 'rgba(160,175,200,0.45)';
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full" style={{ background: '#00D4FF', boxShadow: '0 0 8px rgba(0,212,255,0.8)' }} />
      )}
      <span className="shrink-0 ml-1"><NavIcon name={icon} size={14} /></span>
      {!collapsed && (
        <span className="truncate" style={active ? { fontFamily: 'var(--font-mono)', fontSize: '0.66rem', letterSpacing: '0.06em' } : { fontSize: '0.76rem' }}>
          {label}
        </span>
      )}
    </Link>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Track open/closed state for each group, persisted in localStorage
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return { health: true, finance: true };
    try {
      const stored = localStorage.getItem('sidebar-groups');
      return stored ? JSON.parse(stored) : { health: true, finance: true };
    } catch {
      return { health: true, finance: true };
    }
  });

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem('sidebar-groups', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  }

  // Collect all routes from registry
  const allRoutes = registry.getAllModules().flatMap(mod =>
    mod.routes.map(route => ({ href: route.path, label: route.label, icon: route.icon }))
  );

  // Determine which paths are grouped or bottom-only
  const groupedPaths = new Set(NAV_GROUPS.flatMap(g => g.paths));
  const excludedPaths = new Set([...groupedPaths, ...BOTTOM_NAV_PATHS]);

  // Standalone items: not in any group and not bottom-bar
  const standaloneRoutes = allRoutes.filter(r => !excludedPaths.has(r.href));

  // Dashboard is always first standalone
  const navItems = [
    { href: '/', label: 'Dashboard', icon: 'LayoutGrid' },
    ...standaloneRoutes,
  ];

  // Bottom-bar extra items (Settings)
  const bottomNavItems = allRoutes.filter(r => BOTTOM_NAV_PATHS.has(r.href));

  // Map grouped paths to their route info
  const routeMap = Object.fromEntries(allRoutes.map(r => [r.href, r]));

  return (
    <aside
      className={cn('flex flex-col h-full transition-all duration-200', collapsed ? 'w-14' : 'w-56')}
      style={{ background: 'rgba(6, 9, 14, 0.94)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(0, 212, 255, 0.1)' }}
    >
      {/* Logo */}
      <div className="relative flex items-center justify-center h-16 shrink-0" style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.07)' }}>
        {!collapsed && (
          <div className="flex flex-col items-center gap-0.5">
            <p className="leading-none" style={{ fontFamily: 'var(--font-cinzel)' }}>
              <span className="font-black uppercase" style={{ fontSize: '0.88rem', letterSpacing: '0.28em', color: '#ffffff', textShadow: '0 0 24px rgba(0,212,255,0.4), 0 0 8px rgba(0,212,255,0.2)' }}>CTRL</span>
              <span className="font-normal uppercase" style={{ fontSize: '0.88rem', letterSpacing: '0.2em', color: 'rgba(0,212,255,0.5)' }}>panel</span>
            </p>
            <a href="https://cwmccann.pro" target="_blank" rel="noopener noreferrer" className="uppercase transition-all duration-200"
              style={{ fontFamily: 'var(--font-cinzel)', fontSize: '0.5rem', letterSpacing: '0.28em', color: 'rgba(0,212,255,0.2)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(0,212,255,0.55)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,212,255,0.2)')}>
              by cwmccann.pro
            </a>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="absolute right-2 p-1.5 rounded-md transition-all duration-200"
          style={{ color: 'rgba(0,212,255,0.25)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(0,212,255,0.7)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,212,255,0.25)')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {/* Standalone items */}
        {navItems.map(item => (
          <NavLink key={item.href} {...item} collapsed={collapsed} active={pathname === item.href} />
        ))}

        {/* Grouped sections */}
        {NAV_GROUPS.map(group => {
          const groupRoutes = group.paths.map(p => routeMap[p]).filter(Boolean);
          if (groupRoutes.length === 0) return null;
          const isOpen = openGroups[group.id] !== false;
          const anyActive = groupRoutes.some(r => pathname === r.href || pathname.startsWith(r.href + '/'));

          return (
            <div key={group.id} className="pt-1">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                title={collapsed ? group.label : undefined}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors"
                style={{ color: anyActive ? 'rgba(0,212,255,0.6)' : 'rgba(160,175,200,0.28)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(160,175,200,0.6)')}
                onMouseLeave={e => (e.currentTarget.style.color = anyActive ? 'rgba(0,212,255,0.6)' : 'rgba(160,175,200,0.28)')}
              >
                {collapsed ? (
                  <span className="ml-1 w-[14px] h-[14px] rounded-sm flex items-center justify-center text-[9px]"
                    style={{ background: 'rgba(255,255,255,0.05)', fontFamily: 'var(--font-mono)' }}>
                    {group.label[0]}
                  </span>
                ) : (
                  <>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.2em', textTransform: 'uppercase', flex: 1, textAlign: 'left' }}>
                      {group.label}
                    </span>
                    <ChevronDown size={10} className="shrink-0 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
                  </>
                )}
              </button>

              {/* Group items */}
              {(isOpen || collapsed) && (
                <div className={cn('space-y-0.5', !collapsed && 'pl-3 pt-0.5')}>
                  {groupRoutes.map(r => (
                    <NavLink key={r.href} href={r.href} label={r.label} icon={r.icon} collapsed={collapsed} active={pathname === r.href} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3 pt-2 space-y-1 shrink-0" style={{ borderTop: '1px solid rgba(0,212,255,0.07)' }}>
        {/* Settings + other bottom-bar nav items */}
        {bottomNavItems.map(item => (
          <NavLink key={item.href} {...item} collapsed={collapsed} active={pathname === item.href} />
        ))}


        {userEmail && (
          <div className={cn('flex items-center gap-2 px-2 py-1.5 rounded-md', collapsed ? 'justify-center' : 'justify-between')}>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'rgba(0,212,255,0.2)', textTransform: 'uppercase' }}>Signed In</p>
                <p className="text-[9px] truncate" style={{ color: 'rgba(160,175,200,0.4)' }}>{userEmail}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="shrink-0 p-1.5 rounded-md transition-colors"
              style={{ color: 'rgba(255,255,255,0.2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              title="Sign out"
            >
              <LogOut size={12} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
