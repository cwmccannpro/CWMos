'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bot, CheckCircle2, Clock, Mail, Zap,
  ChevronDown, ChevronUp, Copy, RefreshCw, Loader2, ToggleLeft, ToggleRight,
  AlertCircle, DollarSign, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentState {
  enabled:     boolean;
  daily_limit: number;
  sends_today: number;
  niches:      Array<{ niche: string; city: string; state: string }>;
  cost_7d_usd: number;
  emails_7d:   number;
}

interface Run {
  id:              string;
  run_at:          string;
  action:          string | null;
  lead_name:       string | null;
  lead_email:      string | null;
  niche:           string | null;
  city:            string | null;
  claude_cost_usd: number;
  emails_sent:     number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full shrink-0', active && 'animate-dot-halo')}
      style={{ background: active ? '#10b981' : '#52525b' }}
    />
  );
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function StatBadge({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.08)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.35)', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 700, color: accent ? '#00D4FF' : '#fff', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
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
  const [copied, setCopied]         = useState(false);
  const [genning, setGenning]       = useState(false);
  const [runsOpen, setRunsOpen]     = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen]       = useState(false);
  const [dailyLimit, setDailyLimit]     = useState(10);

  const load = useCallback(async () => {
    const [intRes, runsRes] = await Promise.all([
      fetch('/api/integrations'),
      fetch('/api/outreach-agent/runs'),
    ]);

    if (intRes.ok) {
      const integrations = await intRes.json();
      const outreach = integrations.find((i: { provider: string; credentials: { api_key: string } }) => i.provider === 'outreach-agent');
      setApiKey(outreach?.credentials?.api_key ?? null);
    }
    if (runsRes.ok) setRuns(await runsRes.json());

    // Fetch live status using bearer token if we have a key
    const intRes2 = await fetch('/api/integrations');
    if (intRes2.ok) {
      const ints = await intRes2.json();
      const key = ints.find((i: { provider: string; credentials: { api_key: string } }) => i.provider === 'outreach-agent')?.credentials?.api_key;
      if (key) {
        const stRes = await fetch('/api/outreach/status', { headers: { Authorization: `Bearer ${key}` } });
        if (stRes.ok) {
          const s = await stRes.json();
          setAgentState(s);
          setDailyLimit(s.daily_limit);
        }
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleAgent() {
    if (!agentState) return;
    setToggling(true);
    const res = await fetch('/api/outreach/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !agentState.enabled }),
    });
    if (res.ok) setAgentState(prev => prev ? { ...prev, enabled: !prev.enabled } : prev);
    setToggling(false);
  }

  async function saveLimit() {
    if (!apiKey) return;
    // Patch via the outreach-agent route (session auth)
    await fetch('/api/outreach-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_limit: dailyLimit }),
    });
    setSettingsOpen(false);
    load();
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
    if (res.ok) { setApiKey(key); load(); }
    setGenning(false);
  }

  function copyKey() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={20} className="text-zinc-600 animate-spin" /></div>;
  }

  const remaining = agentState ? Math.max(0, agentState.daily_limit - agentState.sends_today) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 shrink-0">
        <Bot size={16} className="text-cyan-400" />
        <h1 className="text-zinc-100 font-semibold">Agent Manager</h1>
        <div className="flex items-center gap-2 ml-auto">
          <StatusDot active={!!agentState?.enabled} />
          <span className="text-zinc-500 text-xs">{agentState?.enabled ? 'Enabled' : 'Disabled'}</span>
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
            <button onClick={toggleAgent} disabled={toggling || !apiKey} className="flex items-center gap-2 transition-all disabled:opacity-40">
              {toggling
                ? <Loader2 size={20} className="text-zinc-500 animate-spin" />
                : agentState?.enabled
                  ? <ToggleRight size={28} style={{ color: '#00D4FF' }} />
                  : <ToggleLeft  size={28} className="text-zinc-600" />}
              <span className="text-xs" style={{ color: agentState?.enabled ? '#00D4FF' : '#52525b' }}>
                {agentState?.enabled ? 'On' : 'Off'}
              </span>
            </button>
          </div>

          {/* Stats */}
          {agentState && (
            <div className="grid grid-cols-4 gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(0,212,255,0.07)' }}>
              <StatBadge label="Today"      value={`${agentState.sends_today} / ${agentState.daily_limit}`} accent />
              <StatBadge label="Remaining"  value={remaining} />
              <StatBadge label="7d emails"  value={agentState.emails_7d} />
              <StatBadge label="7d cost"    value={`$${agentState.cost_7d_usd.toFixed(2)}`} />
            </div>
          )}

          {/* Niches */}
          {agentState?.niches?.length ? (
            <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(0,212,255,0.07)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.3)', marginBottom: '6px' }}>Active niches</p>
              <div className="flex flex-wrap gap-1.5">
                {agentState.niches.map((n, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full text-zinc-400" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {n.niche} · {n.city}, {n.state}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Settings + Integration Guide row */}
          <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(0,212,255,0.07)' }}>
            <div className="flex items-center gap-4">
              <button onClick={() => { setSettingsOpen(v => !v); setGuideOpen(false); }} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-xs transition-colors">
                <Zap size={11} /><span>Settings</span>
                {settingsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              <button onClick={() => { setGuideOpen(v => !v); setSettingsOpen(false); }} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-xs transition-colors ml-auto">
                <BookOpen size={11} /><span>Integration Guide</span>
                {guideOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            </div>
            {settingsOpen && (
              <div className="pt-3 space-y-3">
                <div>
                  <label className="block text-zinc-500 text-xs mb-1.5">Daily email limit</label>
                  <input type="number" min={1} max={100} value={dailyLimit}
                    onChange={e => setDailyLimit(Number(e.target.value))}
                    className="w-40 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <button onClick={saveLimit} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.2)' }}>
                  Save
                </button>
              </div>
            )}

            {/* Integration Guide */}
            {guideOpen && (
              <div className="pt-4 space-y-4">
                {/* Step 1 */}
                <div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.4)', marginBottom: '6px' }}>
                    Step 1 — Add to outreach-engine/.env
                  </p>
                  <pre className="text-[11px] text-zinc-300 font-mono bg-zinc-900 rounded-xl px-4 py-3 leading-relaxed overflow-x-auto" style={{ border: '1px solid rgba(0,212,255,0.08)' }}>{`DASHBOARD_URL=https://ctrlpanel.pages.dev\nDASHBOARD_BEARER_TOKEN=<copy key below>`}</pre>
                </div>

                {/* Step 2 */}
                <div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.4)', marginBottom: '6px' }}>
                    Step 2 — Enable the agent with the toggle above, then let Task Scheduler run it
                  </p>
                </div>

                {/* Endpoints */}
                <div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.4)', marginBottom: '6px' }}>
                    Endpoints your agent calls (Bearer token required)
                  </p>
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,212,255,0.08)', background: 'rgba(0,0,0,0.3)' }}>
                    {[
                      { method: 'GET',  path: '/api/outreach/status', note: '→ { enabled, sends_today, daily_limit, niches, cost_7d_usd }' },
                      { method: 'POST', path: '/api/outreach/log',    note: '→ { action, lead_name, lead_email, niche, city, claude_cost_usd, emails_sent }' },
                    ].map(({ method, path, note }) => (
                      <div key={path} className="flex flex-col gap-0.5 px-3 py-2.5" style={{ borderBottom: '1px solid rgba(0,212,255,0.05)' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold" style={{ color: method === 'GET' ? '#10b981' : '#00D4FF', width: '30px' }}>{method}</span>
                          <span className="text-xs font-mono text-zinc-300">{path}</span>
                        </div>
                        <p className="text-[10px] text-zinc-600 font-mono pl-9">{note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task Scheduler */}
                <div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.4)', marginBottom: '6px' }}>
                    Windows Task Scheduler (every 2 hrs, 9am–7pm)
                  </p>
                  <pre className="text-[11px] text-zinc-400 font-mono bg-zinc-900 rounded-xl px-4 py-3 leading-relaxed overflow-x-auto" style={{ border: '1px solid rgba(0,212,255,0.08)' }}>{`Program : C:\\Users\\cmcca\\AppData\\Local\\Python\\pythoncore-3.14-64\\python.exe\nArgs    : scripts\\agent.py\nStart in: C:\\Users\\cmcca\\OneDrive\\Documents\\Viridian Outreach\\outreach-engine`}</pre>
                </div>
              </div>
            )}
          </div>

          {/* API Key */}
          <div className="px-5 py-4">
            <p className="text-zinc-500 text-xs mb-3 flex items-center gap-1.5">
              <AlertCircle size={11} />
              Add to <code className="text-zinc-400 bg-zinc-800 px-1 rounded">outreach-engine/.env</code> as <code className="text-zinc-400 bg-zinc-800 px-1 rounded">DASHBOARD_BEARER_TOKEN</code>
            </p>
            {apiKey ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono truncate">{apiKey}</code>
                <button onClick={copyKey} className="shrink-0 p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors">
                  {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
                <button onClick={generateKey} disabled={genning} className="shrink-0 p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors" title="Regenerate">
                  {genning ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                </button>
              </div>
            ) : (
              <button onClick={generateKey} disabled={genning} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.2)' }}>
                {genning ? <Loader2 size={13} className="animate-spin" /> : null}
                Generate API Key
              </button>
            )}
          </div>
        </div>

        {/* ── Run History ──────────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,212,255,0.08)', background: 'rgba(8,12,20,0.9)' }}>
          <button onClick={() => setRunsOpen(v => !v)} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-zinc-800/30 transition-colors">
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
                  <p className="text-zinc-700 text-xs mt-1">Enable the agent — each email and pipeline run will appear here.</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'rgba(0,212,255,0.05)' }}>
                  {runs.map(run => (
                    <div key={run.id} className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-800/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          {run.action && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500">{run.action}</span>}
                          {run.lead_name && <span className="text-zinc-300 text-xs truncate max-w-[140px]">{run.lead_name}</span>}
                          {run.niche && <span className="text-zinc-600 text-[10px]">{run.niche}{run.city ? ` · ${run.city}` : ''}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {run.emails_sent > 0 && <span className="text-zinc-500 text-[10px]">{run.emails_sent} sent</span>}
                          {run.claude_cost_usd > 0 && (
                            <span className="flex items-center gap-0.5 text-zinc-600 text-[10px]">
                              <DollarSign size={8} />{Number(run.claude_cost_usd).toFixed(4)}
                            </span>
                          )}
                          {run.lead_email && <span className="text-zinc-700 text-[10px] truncate">{run.lead_email}</span>}
                        </div>
                      </div>
                      <span className="text-zinc-600 text-[10px] shrink-0">{fmtTime(run.run_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
