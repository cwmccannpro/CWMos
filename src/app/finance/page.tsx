'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, DollarSign, BarChart2, Plus, Trash2 } from 'lucide-react';
import { GlowBar } from '@/components/ui/GlowBar';
import { cn } from '@/lib/utils';

interface IncomeSrc { id: string; source: string; amount_cents: number; frequency: string }
interface Category { id: string; name: string; budget_cents: number; color: string; spent_cents: number }
interface Investment { id: string; ticker: string; name: string | null; shares: number; avg_cost_cents: number }
interface Summary {
  income: { monthly_cents: number; sources: IncomeSrc[] };
  budget: { total_budget_cents: number; total_spent_cents: number; categories: Category[]; month: string };
  investments: Investment[];
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <Icon size={13} className="text-zinc-500" />
        <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatCard({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={cn('text-2xl font-bold tabular-nums', positive === undefined ? 'text-zinc-100' : positive ? 'text-emerald-400' : 'text-rose-400')}>{value}</p>
      {sub && <p className="text-zinc-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

export default function FinancePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Add income form
  const [showIncome, setShowIncome] = useState(false);
  const [incomeSource, setIncomeSource] = useState('');
  const [incomeAmt, setIncomeAmt] = useState('');
  const [incomeFreq, setIncomeFreq] = useState('monthly');

  async function load() {
    const res = await fetch('/api/finance/summary');
    if (res.ok) setSummary(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addIncome() {
    if (!incomeSource || !incomeAmt) return;
    await fetch('/api/finance/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: incomeSource, amount_cents: Math.round(parseFloat(incomeAmt) * 100), frequency: incomeFreq }),
    });
    setIncomeSource(''); setIncomeAmt(''); setShowIncome(false);
    load();
  }

  async function deleteIncome(id: string) {
    await fetch(`/api/finance/income?id=${id}`, { method: 'DELETE' });
    load();
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-zinc-800 rounded-xl" />)}
      </div>
    );
  }

  const { income, budget, investments } = summary ?? { income: { monthly_cents: 0, sources: [] }, budget: { total_budget_cents: 0, total_spent_cents: 0, categories: [], month: '' }, investments: [] };
  const remaining = income.monthly_cents - budget.total_spent_cents;
  const savingsRate = income.monthly_cents > 0 ? Math.round((remaining / income.monthly_cents) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-400" />
          <h1 className="text-zinc-100 font-semibold">Finance</h1>
        </div>
        <span className="text-zinc-600 text-xs">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Monthly Income" value={fmt(income.monthly_cents)} sub={`${income.sources.length} source${income.sources.length !== 1 ? 's' : ''}`} />
          <StatCard label="Spent This Month" value={fmt(budget.total_spent_cents)} sub={`of ${fmt(budget.total_budget_cents)} budget`} />
          <StatCard label={remaining >= 0 ? 'Saved' : 'Over Budget'} value={fmt(Math.abs(remaining))} sub={`${Math.abs(savingsRate)}% ${remaining >= 0 ? 'savings rate' : 'over'}`} positive={remaining >= 0} />
          <StatCard label="Portfolio" value={`${investments.length} holdings`} sub="View in Investing tab" />
        </div>

        {/* Budget progress */}
        {budget.categories.length > 0 && (
          <Section title="Budget Progress" icon={Wallet}>
            <div className="space-y-3">
              <GlowBar value={budget.total_spent_cents} goal={budget.total_budget_cents || 1} label="Total" valueLabel={`${fmt(budget.total_spent_cents)} / ${fmt(budget.total_budget_cents)}`} height={6} />
              <div className="pt-2 space-y-2.5">
                {budget.categories.map(c => (
                  <GlowBar key={c.id} value={c.spent_cents} goal={c.budget_cents || 1} label={c.name} valueLabel={`${fmt(c.spent_cents)} / ${fmt(c.budget_cents)}`} />
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* Income sources */}
        <Section title="Income Sources" icon={DollarSign}>
          <div className="space-y-2">
            {income.sources.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-zinc-800">
                <div>
                  <p className="text-zinc-200 text-sm">{s.source}</p>
                  <p className="text-zinc-600 text-xs capitalize">{s.frequency}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-zinc-200 text-sm font-semibold tabular-nums">{fmt(s.amount_cents)}</p>
                  <button onClick={() => deleteIncome(s.id)} className="text-zinc-700 hover:text-rose-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}

            {showIncome ? (
              <div className="pt-2 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <input value={incomeSource} onChange={e => setIncomeSource(e.target.value)} placeholder="e.g. Salary" className="col-span-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500" />
                  <input value={incomeAmt} onChange={e => setIncomeAmt(e.target.value)} type="number" placeholder="Amount ($)" className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500" />
                  <select value={incomeFreq} onChange={e => setIncomeFreq(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500">
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={addIncome} className="px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-500 transition-colors">Add</button>
                  <button onClick={() => setShowIncome(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs rounded-lg hover:bg-zinc-700 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowIncome(true)} className="flex items-center gap-2 mt-2 text-zinc-600 hover:text-zinc-300 text-xs transition-colors">
                <Plus size={12} /> Add income source
              </button>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
