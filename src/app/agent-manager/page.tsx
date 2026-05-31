'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bot, Circle, CheckCircle2, XCircle, Clock, Mail, Zap,
  ChevronDown, ChevronUp, Copy, RefreshCw, Loader2, ToggleLeft, ToggleRight,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentState {
  enabled: boolean;
  daily_limit: number;
  batch_size: number;
  emails_today: number;
  last_reset_date: string;
  can_send: boolean;
  remaining: number;
}

interface Run {
  id: string;
  emails_sent: number;
  leads_found: number;
  status: 'running' | 'completed' | 'error';
  notes: string | null;
  started_at: string;
  completed_at: string | null;
}

interface ApiKey { api_key: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: 'running' | 'completed' | 'error' | 'idle' }) {
  const map = {
    running:   { color: '#10b981', pulse: true },
    completed: { color: '#00D4FF', pulse: false },
    error:     { color: '#f87171', pulse: false },
    idle:      { color: '#52525b', pulse: false },
  };
  const { color, pulse } = map[status];
  return (
    <span className={cn('inline-block w-2 h-2 rounded-full shrink-0', pulse && 'animate-dot-halo')} style={{ background: color }} />
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  return isToday
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function StatBadge({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.08)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.35)', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: accent ? '#00D4FF' : '#fff', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AgentManagerPage() {
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [runs, setRuns]             = useState<Run[]>([]);
  const [apiKey, setApiKey]         = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [toggling, setToggling]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [copied, setCopied]         = useState(false);
  const [genning, setGenning]       = useState(false);
  const [runsOpen, setRunsOpen]     = useState(true);

  // Editable settings
  const [dailyLimit, setDailyLimit] = useState(10);
  const [batchSize, setBatchSize]   = useState(2);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    const [stateRes, runsRes, intRes] = await Promise.all([
      fetch('/api/outreach-agent'),
      fetch('/api/outreach-agent/runs'),
      fetch('/api/integrations'),
    ]);
    if (stateRes.ok) {
      const s = await stateRes.json();
      setAgentState(s);
      setDailyLimit(s.daily_limit);
      setBatchSize(s.batch_size);
    }
    if (runsRes.ok) setRuns(await runsRes.json());
    if (intRes.ok) {
      const integrations = await intRes.json();
      const outreach = integrations.find((i: { provider: string; credentials: ApiKey }) => i.provider === 'outreach-agent');
      setApiKey(outreach?.credentials?.api_key ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s when a run is in progress
  useEffect(() => {
    const hasRunning = runs.some(r => r.status === 'running');
    if (!hasRunning) return;
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [runs, load]);

  async function toggleAgent() {
    if (!agentState) return;
    setToggling(true);
    const res = await fetch('/api/outreach-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !agentState.enabled }),
    });
    if (res.ok) setAgentState(await res.json());
    setToggling(false);
  }

  async function saveSettings() {
    setSaving(true);
    const res = await fetch('/api/outreach-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_limit: dailyLimit, batch_size: batchSize }),
    });
    if (res.ok) setAgentState(await res.json());
    setSaving(false);
    setSettingsOpen(false);
  }

  async function generateKey() {
    setGenning(true);
    const key = Array.from(crypto.getRandomValues(new Uint8Array(28)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const res = await fetch('/api/integrations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'outreach-agent', credentials: { api_key: key }, enabled: true }),
    });
    if (res.ok) setApiKey(key);
    setGenning(false);
  }

  function copyKey() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const runningRun = runs.find(r => r.status === 'running');
  const statusLabel: 'running' | 'completed' | 'error' | 'idle' = runningRun
    ? 'running'
    : agentState?.enabled
    ? 'idle'
    : 'error';

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={20} className="text-zinc-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 shrink-0">
        <Bot size={16} className="text-cyan-400" />
        <h1 className="text-zinc-100 font-semibold">Agent Manager</h1>
        <div className="flex items-center gap-2 ml-auto">
          <StatusDot status={statusLabel} />
          <span className="text-zinc-500 text-xs capitalize">{!agentState ? 'unknown' : runningRun ? 'running' : agentState.enabled ? 'idle' : 'disabled'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* ── Outreach Agent Card ──────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,212,255,0.12)', background: 'rgba(8,12,20,0.9)' }}>
          {/* Card header */}
          <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: '1px solid rgba(0,212,255,0.07)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' }}>
              <Mail size={16} style={{ color: '#00D4FF' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-zinc-100 text-sm font-medium">Outreach Agent</p>
              <p className="text-zinc-500 text-xs mt-0.5">Autonomous email outreach · runs every 2 hours</p>
            </div>

            {/* Toggle */}
            <button
              onClick={toggleAgent}
              disabled={toggling}
              className="flex items-center gap-2 transition-all"
              title={agentState?.enabled ? 'Disable agent' : 'Enable agent'}
            >
              {toggling
                ? <Loader2 size={20} className="text-zinc-500 animate-spin" />
                : agentState?.enabled
                  ? <ToggleRight size={28} style={{ color: '#00D4FF' }} />
                  : <ToggleLeft  size={28} className="text-zinc-600" />}
              <span className="text-xs" style={{ color: agentState?.enabled ? '#00D4FF' : '#52525b' }}>
                {agentState?.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </button>
          </div>

          {/* Stats row */}
          {agentState && (
            <div className="grid grid-cols-3 gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(0,212,255,0.07)' }}>
              <StatBadge label="Emails today"   value={`${agentState.emails_today} / ${agentState.daily_limit}`} accent />
              <StatBadge label="Remaining"      value={agentState.remaining} />
              <StatBadge label="Batch size"     value={agentState.batch_size} />
            </div>
          )}

          {/* Running run banner */}
          {runningRun && (
            <div className="flex items-center gap-3 px-5 py-3" style={{ background: 'rgba(16,185,129,0.06)', borderBottom: '1px solid rgba(16,185,129,0.12)' }}>
              <StatusDot status="running" />
              <span className="text-emerald-400 text-xs font-medium">Run in progress</span>
              <span className="text-zinc-500 text-xs ml-auto">Started {fmtTime(runningRun.started_at)}</span>
            </div>
          )}

          {/* Settings panel */}
          <div className="px-5 py-3" style={{ borderBottom: settingsOpen ? '1px solid rgba(0,212,255,0.07)' : 'none' }}>
            <button onClick={() => setSettingsOpen(v => !v)} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-xs transition-colors w-full">
              <Zap size={11} />
              <span>Settings</span>
              {settingsOpen ? <ChevronUp size={11} className="ml-auto" /> : <ChevronDown size={11} className="ml-auto" />}
            </button>

            {settingsOpen && (
              <div className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-500 text-xs mb-1.5">Daily email limit</label>
                    <input
                      type="number" min={1} max={100}
                      value={dailyLimit}
                      onChange={e => setDailyLimit(Number(e.target.value))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 text-xs mb-1.5">Batch size per run</label>
                    <input
                      type="number" min={1} max={20}
                      value={batchSize}
                      onChange={e => setBatchSize(Number(e.target.value))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
                <button onClick={saveSettings} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                  style={{ background: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.2)' }}
                >
                  {saving ? <Loader2 size={11} className="animate-spin" /> : null}
                  Save settings
                </button>
              </div>
            )}
          </div>

          {/* API Key section */}
          <div className="px-5 py-4">
            <p className="text-zinc-500 text-xs mb-3 flex items-center gap-1.5">
              <AlertCircle size={11} /> API Key — paste into <code className="text-zinc-400 bg-zinc-800 px-1 rounded">outreach-engine/.env</code> as <code className="text-zinc-400 bg-zinc-800 px-1 rounded">DASHBOARD_BEARER_TOKEN</code>
            </p>
            {apiKey ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono truncate">
                  {apiKey}
                </code>
                <button onClick={copyKey} className="shrink-0 p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors" title="Copy key">
                  {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
                <button onClick={generateKey} disabled={genning} className="shrink-0 p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors" title="Regenerate key">
                  {genning ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                </button>
              </div>
            ) : (
              <button onClick={generateKey} disabled={genning}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.2)' }}
              >
                {genning ? <Loader2 size={13} className="animate-spin" /> : null}
                Generate API Key
              </button>
            )}
            {apiKey && (
              <p className="text-zinc-700 text-[10px] mt-2">Regenerating invalidates the old key — update your .env file too.</p>
            )}
          </div>
        </div>

        {/* ── Run History ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,212,255,0.08)', background: 'rgba(8,12,20,0.9)' }}>
          <button
            onClick={() => setRunsOpen(v => !v)}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-zinc-800/30"
          >
            <Clock size={13} className="text-zinc-500" />
            <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider flex-1">Run History</span>
            <span className="text-zinc-600 text-xs">{runs.length} runs</span>
            {runsOpen ? <ChevronUp size={13} className="text-zinc-600" /> : <ChevronDown size={13} className="text-zinc-600" />}
          </button>

          {runsOpen && (
            <div style={{ borderTop: '1px solid rgba(0,212,255,0.06)' }}>
              {runs.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-zinc-600 text-sm">No runs yet.</p>
                  <p className="text-zinc-700 text-xs mt-1">Enable the agent and it will log each run here.</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'rgba(0,212,255,0.05)' }}>
                  {runs.map(run => (
                    <div key={run.id} className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-800/20 transition-colors">
                      <StatusDot status={run.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-300 text-xs">
                            <span className="font-medium">{run.emails_sent}</span> sent
                          </span>
                          {run.leads_found > 0 && (
                            <span className="text-zinc-500 text-xs">{run.leads_found} leads found</span>
                          )}
                          <span className={cn('text-[10px] capitalize', run.status === 'running' ? 'text-emerald-400' : run.status === 'error' ? 'text-rose-400' : 'text-zinc-600')}>
                            {run.status}
                          </span>
                        </div>
                        {run.notes && <p className="text-zinc-600 text-[10px] mt-0.5 truncate">{run.notes}</p>}
                      </div>
                      <span className="text-zinc-600 text-[10px] shrink-0">{fmtTime(run.started_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Python agent quick-reference */}
        <div className="rounded-xl px-4 py-3.5 space-y-2" style={{ background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.07)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.3)' }}>
            Python agent .env
          </p>
          <pre className="text-[11px] text-zinc-400 font-mono leading-relaxed overflow-x-auto">{`DASHBOARD_URL=https://ctrlpanel.pages.dev
DASHBOARD_BEARER_TOKEN=<paste key above>`}</pre>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.3)', paddingTop: '6px' }}>
            API endpoints your agent calls
          </p>
          <pre className="text-[11px] text-zinc-400 font-mono leading-relaxed overflow-x-auto">{`GET  /api/outreach-agent           → { enabled, can_send, remaining, ... }
POST /api/outreach-agent/runs      → create run { id, status: 'running' }
PATCH /api/outreach-agent/runs     → finish run { id, status, emails_sent, notes }
POST /api/outreach-agent/increment → { count: 2 } → { emails_today, can_send }`}</pre>
        </div>
      </div>
    </div>
  );
}
