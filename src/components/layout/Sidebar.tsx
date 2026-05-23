'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid, CalendarDays, LayoutDashboard, Bot, ChevronLeft, ChevronRight,
  Leaf, BarChart3, Target, HeartPulse, UtensilsCrossed, Pill, Dumbbell,
  Settings2, LogOut, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { registry } from '@/lib/registry';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid, CalendarDays, LayoutDashboard, Bot, Leaf, BarChart3, Target,
  HeartPulse, UtensilsCrossed, Pill, Dumbbell, Settings2,
};

function NavIcon({ name, size = 15 }: { name?: string; size?: number }) {
  const Icon = name ? ICON_MAP[name] : null;
  if (!Icon) return <span className="w-[15px]" />;
  return <Icon size={size} />;
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMasterController: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, onOpenMasterController }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  }

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
        'flex flex-col h-full transition-all duration-200',
        collapsed ? 'w-14' : 'w-56'
      )}
      style={{
        background: 'rgba(6, 9, 14, 0.94)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(0, 212, 255, 0.1)',
      }}
    >
      {/* Logo */}
      <div
        className="relative flex items-center justify-center h-16 shrink-0"
        style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.07)' }}
      >
        {!collapsed && (
          <div className="flex flex-col items-center gap-0.5">
            <p className="leading-none" style={{ fontFamily: 'var(--font-cinzel)' }}>
              <span
                className="font-black uppercase"
                style={{
                  fontSize: '0.88rem',
                  letterSpacing: '0.28em',
                  color: '#ffffff',
                  textShadow: '0 0 24px rgba(0,212,255,0.4), 0 0 8px rgba(0,212,255,0.2)',
                }}
              >CTRL</span>
              <span
                className="font-normal uppercase"
                style={{
                  fontSize: '0.88rem',
                  letterSpacing: '0.2em',
                  color: 'rgba(0,212,255,0.5)',
                }}
              >panel</span>
            </p>
            <a
              href="https://cwmccann.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="uppercase transition-all duration-200"
              style={{
                fontFamily: 'var(--font-cinzel)',
                fontSize: '0.5rem',
                letterSpacing: '0.28em',
                color: 'rgba(0,212,255,0.2)',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(0,212,255,0.55)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,212,255,0.2)')}
            >
              by cwmccann.pro
            </a>
          </div>
        )}

        {/* Collapse toggle */}
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
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className="relative flex items-center gap-3 px-2 py-2 rounded-md transition-all duration-200 group"
              style={active ? {
                color: '#00D4FF',
                background: 'rgba(0,212,255,0.06)',
              } : {
                color: 'rgba(160,175,200,0.45)',
              }}
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
              {/* Active left bar */}
              {active && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
                  style={{
                    background: '#00D4FF',
                    boxShadow: '0 0 8px rgba(0,212,255,0.8)',
                  }}
                />
              )}

              <span className="shrink-0 ml-1">
                <NavIcon name={item.icon} size={15} />
              </span>

              {!collapsed && (
                <span
                  className="truncate"
                  style={active ? {
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
                    letterSpacing: '0.06em',
                  } : {
                    fontSize: '0.78rem',
                  }}
                >
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div
        className="px-2 pb-3 pt-2 space-y-1 shrink-0"
        style={{ borderTop: '1px solid rgba(0,212,255,0.07)' }}
      >
        {/* Master Controller — glowing pulse button */}
        <button
          onClick={onOpenMasterController}
          title={collapsed ? 'Master Controller' : undefined}
          className={cn(
            'flex items-center gap-2.5 w-full px-2 py-2 rounded-md transition-all duration-200 animate-glow-pulse',
            collapsed ? 'justify-center' : ''
          )}
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
        >
          <span className="shrink-0"><Bot size={14} /></span>
          {!collapsed && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              letterSpacing: '0.1em',
            }}>
              MASTER CTRL
            </span>
          )}
        </button>

        {/* User row */}
        {userEmail && (
          <div className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md',
            collapsed ? 'justify-center' : 'justify-between'
          )}>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'rgba(0,212,255,0.2)', textTransform: 'uppercase' }}>
                  Signed In
                </p>
                <p className="text-[9px] truncate" style={{ color: 'rgba(160,175,200,0.4)' }}>
                  {userEmail}
                </p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="shrink-0 p-1.5 rounded-md transition-colors"
              style={{ color: 'rgba(255,255,255,0.2)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = '#f87171';
                (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
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
