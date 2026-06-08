'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Loader2, ExternalLink, Save, Settings2, Copy, RefreshCw, Palette, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_THEME, applyTheme, type ThemeConfig } from '@/components/providers/ThemeProvider';

interface StoredIntegration {
  provider: string;
  credentials: Record<string, unknown>;
  enabled: boolean;
  updated_at: string;
}

// ── iCal ──────────────────────────────────────────────────────────────────────

function ICalCard({ existing }: { existing: StoredIntegration | null }) {
  const [open, setOpen] = useState(!existing);
  const [urls, setUrls] = useState<string[]>((existing?.credentials?.urls as string[]) ?? []);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function addUrl() {
    const trimmed = input.trim();
    if (!trimmed || urls.includes(trimmed)) return;
    setUrls(prev => [...prev, trimmed]);
    setInput('');
  }

  function removeUrl(url: string) {
    setUrls(prev => prev.filter(u => u !== url));
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    const res = await fetch('/api/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'ical', credentials: { urls }, enabled: true }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const body = await res.json().catch(() => ({}));
      setSaveError(body.error ?? `Save failed (${res.status})`);
    }
  }

  const connected = urls.length > 0;

  return (
    <IntegrationCard
      name="iCalendar"
      description="Apple Calendar, Google Calendar, or any .ics feed"
      logo="📅"
      connected={connected}
      open={open}
      onToggle={() => setOpen(v => !v)}
    >
      <div className="space-y-4">
        <Steps steps={[
          { n: 1, text: 'Apple Calendar: open Calendar app → right-click a calendar → Share Calendar → Copy Link' },
          {
            n: 2, text: 'Google Calendar: go to', link: { label: 'calendar.google.com', url: 'https://calendar.google.com' },
            after: '→ Settings (gear) → choose a calendar → scroll to "Secret address in iCal format" → copy the link',
          },
          { n: 3, text: 'Paste the URL below and click Add. Repeat for each calendar.' },
        ]} />

        {/* URL list */}
        {urls.length > 0 && (
          <div className="space-y-1.5">
            {urls.map(url => (
              <div key={url} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                <span className="flex-1 text-[10px] text-zinc-400 font-mono truncate">{url}</span>
                <button
                  onClick={() => removeUrl(url)}
                  className="shrink-0 text-zinc-600 hover:text-rose-400 transition-colors text-xs"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Add URL input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addUrl()}
            placeholder="https://p71-caldav.icloud.com/published/2/..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors font-mono"
          />
          <button
            onClick={addUrl}
            disabled={!input.trim()}
            className="px-3 py-2 rounded-lg bg-zinc-700 text-zinc-300 text-xs font-medium hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >Add</button>
        </div>

        <SaveRow saving={saving} saved={saved} saveError={saveError} onSave={save} disabled={urls.length === 0} />
      </div>
    </IntegrationCard>
  );
}

// ── Nutrition Sync ────────────────────────────────────────────────────────────

function NutritionSyncCard({ existing, onSaved }: { existing: StoredIntegration | null; onSaved: () => void }) {
  const [open, setOpen] = useState(!existing);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const apiKey = existing?.credentials?.api_key as string | undefined;

  async function generate() {
    setSaving(true);
    setSaveError(null);
    const key = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const res = await fetch('/api/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'nutrition-chatgpt', credentials: { api_key: key }, enabled: true }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
    } else {
      const body = await res.json().catch(() => ({}));
      setSaveError(body.error ?? `Save failed (${res.status})`);
    }
  }

  function copy() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <IntegrationCard
      name="Nutrition Sync (ChatGPT)"
      description="Log meals from a Custom GPT directly to your dashboard"
      logo="🥗"
      connected={!!apiKey}
      open={open}
      onToggle={() => setOpen(v => !v)}
    >
      <div className="space-y-4">
        <Steps steps={[
          { n: 1, text: 'Click Generate to create your personal API key' },
          { n: 2, text: 'Copy the key and paste it into your Custom GPT action as the Bearer token' },
          { n: 3, text: 'Each user gets their own key — meals log to their own account' },
        ]} />

        {apiKey ? (
          <div>
            <label className="block text-zinc-400 text-xs font-medium mb-1.5">Your API Key</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono truncate">
                {apiKey}
              </code>
              <button onClick={copy} className="shrink-0 p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors">
                {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
              <button onClick={generate} disabled={saving} className="shrink-0 p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors" title="Regenerate key">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              </button>
            </div>
            <p className="text-zinc-600 text-[10px] mt-1.5">Regenerating will invalidate the old key — update your GPT action too.</p>
          </div>
        ) : (
          <button
            onClick={generate}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Generate API Key
          </button>
        )}
        {saveError && <p className="text-rose-400 text-xs mt-2">{saveError}</p>}
      </div>
    </IntegrationCard>
  );
}

// ── Theme ─────────────────────────────────────────────────────────────────────

function ThemeCard({ existing }: { existing: StoredIntegration | null }) {
  const stored = (existing?.credentials ?? {}) as Partial<ThemeConfig>;
  const [theme, setTheme] = useState<ThemeConfig>({ ...DEFAULT_THEME, ...stored });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update(key: keyof ThemeConfig, value: string) {
    const next = { ...theme, [key]: value };
    setTheme(next);
    applyTheme(next);
  }

  function reset() {
    setTheme(DEFAULT_THEME);
    applyTheme(DEFAULT_THEME);
  }

  async function save() {
    setSaving(true);
    const res = await fetch('/api/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'theme', credentials: theme, enabled: true }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  const SWATCHES: { key: keyof ThemeConfig; label: string }[] = [
    { key: 'cyan',      label: 'Accent (Cyan)' },
    { key: 'violet',    label: 'Secondary (Violet)' },
    { key: 'gold',      label: 'Highlight (Gold)' },
    { key: 'bg',        label: 'Background' },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4 border-b border-zinc-800">
        <Palette size={18} className="text-zinc-400" />
        <div className="flex-1">
          <p className="text-zinc-100 text-sm font-medium">Theme Customization</p>
          <p className="text-zinc-500 text-xs mt-0.5">Adjust colors — changes apply live</p>
        </div>
        <button onClick={reset} className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-300 text-xs transition-colors" title="Reset to defaults">
          <RotateCcw size={11} /> Reset
        </button>
      </div>
      <div className="px-5 pb-5 pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {SWATCHES.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-zinc-400 text-xs font-medium mb-1.5">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme[key]}
                  onChange={e => update(key, e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="text-zinc-500 text-xs font-mono">{theme[key]}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          {saved && <p className="text-emerald-400 text-xs">Saved</p>}
          <button
            onClick={save}
            disabled={saving}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save Theme
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function IntegrationCard({
  name, description, logo, connected, open, onToggle, children,
}: {
  name: string; description: string; logo: string;
  connected: boolean; open: boolean; onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/50 transition-colors text-left"
      >
        <span className="text-2xl">{logo}</span>
        <div className="flex-1 min-w-0">
          <p className="text-zinc-100 text-sm font-medium">{name}</p>
          <p className="text-zinc-500 text-xs mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {connected ? (
            <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
              <CheckCircle2 size={13} /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-zinc-500 text-xs">
              <XCircle size={13} /> Not connected
            </span>
          )}
          {open ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function Steps({ steps }: {
  steps: Array<{ n: number; text: string; link?: { label: string; url: string }; after?: string }>;
}) {
  return (
    <ol className="space-y-2">
      {steps.map(s => (
        <li key={s.n} className="flex items-start gap-2.5 text-xs text-zinc-400">
          <span className="shrink-0 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-500 font-medium mt-0.5">
            {s.n}
          </span>
          <span className="leading-relaxed">
            {s.text}{' '}
            {s.link && (
              <a
                href={s.link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5"
              >
                {s.link.label}<ExternalLink size={10} className="ml-0.5" />
              </a>
            )}
            {s.after && <> {s.after}</>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function SaveRow({ saving, saved, saveError, onSave, disabled }: {
  saving: boolean; saved: boolean; saveError?: string | null; onSave: () => void; disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      {saved && <p className="text-emerald-400 text-xs">Saved successfully</p>}
      {!saved && saveError && <p className="text-rose-400 text-xs">{saveError}</p>}
      <div className="ml-auto">
        <button
          onClick={onSave}
          disabled={disabled || saving}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            'bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [integrations, setIntegrations] = useState<StoredIntegration[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/integrations');
    if (res.ok) setIntegrations(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const get = (provider: string) => integrations.find(i => i.provider === provider) ?? null;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Settings2 size={20} className="text-zinc-400" />
        <h1 className="text-zinc-100 text-xl font-semibold">Settings</h1>
      </div>

      <section className="space-y-6">
        <div>
          <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">Appearance</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm"><Loader2 size={14} className="animate-spin" /> Loading…</div>
          ) : (
            <ThemeCard existing={get('theme')} />
          )}
        </div>

        <div>
          <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">Integrations</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-3">
              <NutritionSyncCard existing={get('nutrition-chatgpt')} onSaved={load} />
              <ICalCard existing={get('ical')} />
            </div>
          )}
        </div>
      </section>

      <p className="text-zinc-700 text-xs mt-8">
        More integrations (Google Calendar, Notion, Linear…) coming soon.
      </p>
    </div>
  );
}
