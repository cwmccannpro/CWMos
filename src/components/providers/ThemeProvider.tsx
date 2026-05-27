'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ThemeConfig {
  cyan:       string;
  violet:     string;
  gold:       string;
  bg:         string;
  sidebarBg:  string;
}

export const DEFAULT_THEME: ThemeConfig = {
  cyan:      '#00D4FF',
  violet:    '#8B5CF6',
  gold:      '#F59E0B',
  bg:        '#080B10',
  sidebarBg: 'rgba(6,9,14,0.94)',
};

function applyTheme(theme: Partial<ThemeConfig>) {
  const root = document.documentElement;
  if (theme.cyan)      root.style.setProperty('--cyan',      theme.cyan);
  if (theme.violet)    root.style.setProperty('--violet',    theme.violet);
  if (theme.gold)      root.style.setProperty('--gold',      theme.gold);
  if (theme.bg)        root.style.setProperty('--bg',        theme.bg);
  if (theme.sidebarBg) root.style.setProperty('--sidebar-bg', theme.sidebarBg);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: integration } = await supabase
        .from('user_integrations')
        .select('credentials')
        .eq('user_id', data.user.id)
        .eq('provider', 'theme')
        .single();
      if (integration?.credentials) {
        applyTheme(integration.credentials as Partial<ThemeConfig>);
      }
    });
  }, []);

  return <>{children}</>;
}

export { applyTheme };
