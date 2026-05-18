'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Loader2, ExternalLink, Save, Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoredIntegration {
  provider: string;
  credentials: Record<string, unknown>;
  enabled: boolean;
  updated_at: string;
}

// ── Trello ────────────────────────────────────────────────────────────────────

function TrelloCard({ existing }: { existing: StoredIntegration | null }) {
  const [open, setOpen] = useState(!existing);
  const [apiKey, setApiKey] = useState((existing?.credentials?.api_key as string) ?? '');
  const [token, setToken] = useState((existing?.credentials?.token as string) ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await fetch('/api/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'trello', credentials: { api_key: apiKey, token }, enabled: true }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const connected = !!existing?.credentials?.api_key;

  return (
    <IntegrationCard
      name="Trello"
      description="Sync your boards, lists, and cards"
      logo="🟦"
      connected={connected}
      open={open}
      onToggle={() => setOpen(v => !v)}
    >
      <div className="space-y-4">
        <Steps steps={[
          { n: 1, text: 'Go to', link: { label: 'trello.com/power-ups/admin', url: 'https://trello.com/power-ups/admin' } },
          { n: 2, text: 'Create a new Power-Up → copy the API Key shown on that page' },
          { n: 3, text: 'On the same page click "Token" → approve and copy the token' },
        ]} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="API Key" value={apiKey} onChange={setApiKey} placeholder="trello api key" />
          <Field label="Token" value={token} onChange={setToken} placeholder="trello token" />
        </div>
        <SaveRow saving={saving} saved={saved} onSave={save} disabled={!apiKey || !token} />
      </div>
    </IntegrationCard>
  );
}

// ── iCal ──────────────────────────────────────────────────────────────────────

function ICalCard({ existing }: { existing: StoredIntegration | null }) {
  const [open, setOpen] = useState(!existing);
  const [urls, setUrls] = useState(
    ((existing?.credentials?.urls as string[]) ?? []).join('\n')
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    const parsed = urls.split('\n').map(u => u.trim()).filter(Boolean);
    await fetch('/api/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'ical', credentials: { urls: parsed }, enabled: true }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const connected = !!existing?.credentials?.urls;

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
          {
            n: 1, text: 'Apple Calendar: open Calendar app → right-click a calendar → Share → Copy Link',
          },
          {
            n: 2, text: 'Google Calendar: go to', link: { label: 'calendar.google.com', url: 'https://calendar.google.com' },
            after: '→ Settings (gear) → choose a calendar → "Secret address in iCal format" → copy the link',
          },
          {
            n: 3, text: 'Paste each URL on a new line below (you can add multiple calendars)',
          },
        ]} />
        <div>
          <label className="block text-zinc-400 text-xs font-medium mb-1.5">Calendar URLs (one per line)</label>
          <textarea
            value={urls}
            onChange={e => setUrls(e.target.value)}
            rows={4}
            placeholder="https://p71-caldav.icloud.com/published/2/..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors resize-none font-mono"
          />
        </div>
        <SaveRow saving={saving} saved={saved} onSave={save} disabled={!urls.trim()} />
      </div>
    </IntegrationCard>
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

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div>
      <label className="block text-zinc-400 text-xs font-medium mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors font-mono"
      />
    </div>
  );
}

function SaveRow({ saving, saved, onSave, disabled }: {
  saving: boolean; saved: boolean; onSave: () => void; disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      {saved && <p className="text-emerald-400 text-xs">Saved successfully</p>}
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

      <section>
        <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">Integrations</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-3">
            <TrelloCard existing={get('trello')} />
            <ICalCard existing={get('ical')} />
          </div>
        )}
      </section>

      <p className="text-zinc-700 text-xs mt-8">
        More integrations (Google Calendar, Notion, Linear…) coming soon.
      </p>
    </div>
  );
}
