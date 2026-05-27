'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, BarChart2 } from 'lucide-react';
import { GlowBar } from '@/components/ui/GlowBar';
import type { WidgetProps } from '@/types';

interface FinanceSummary {
  income: { monthly_cents: number; sources: any[] };
  budget: { total_budget_cents: number; total_spent_cents: number; categories: any[]; month: string };
  investments: any[];
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.3)', marginBottom: '4px' }}>
      {children}
    </p>
  );
}

function BigNum({ value, sub }: { value: string; sub?: string }) {
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {sub && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'rgba(160,175,200,0.4)', marginTop: '3px' }}>{sub}</p>}
    </div>
  );
}

function useSummary() {
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/finance/summary')
      .then(r => r.json())
      .then(d => { if (d.error) setError(true); else setData(d); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

// ─── Finance Overview Widget ──────────────────────────────────────────────────

export function FinanceOverviewWidget({ widgetInstanceId }: WidgetProps) {
  const { data, loading, error } = useSummary();

  if (loading) return <Loading />;
  if (error || !data) return <Empty msg="Connect finance data to get started." />;

  const { income, budget } = data;
  const remaining = income.monthly_cents - budget.total_spent_cents;
  const savingsRate = income.monthly_cents > 0
    ? Math.round(((income.monthly_cents - budget.total_spent_cents) / income.monthly_cents) * 100)
    : 0;

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <TrendingUp size={11} style={{ color: '#F59E0B', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.4)' }}>
          Finance · This Month
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 shrink-0">
        {[
          { label: 'Income', value: fmt(income.monthly_cents), sub: 'monthly' },
          { label: 'Spent', value: fmt(budget.total_spent_cents), sub: `of ${fmt(budget.total_budget_cents)} budget` },
          { label: remaining >= 0 ? 'Saved' : 'Over', value: fmt(Math.abs(remaining)), sub: `${savingsRate}% rate` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-lg p-2.5" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.08)' }}>
            <MonoLabel>{label}</MonoLabel>
            <BigNum value={value} sub={sub} />
          </div>
        ))}
      </div>

      <div className="flex-1 space-y-2 overflow-hidden">
        <MonoLabel>Budget by Category</MonoLabel>
        {budget.categories.slice(0, 4).map((c: any) => (
          <GlowBar
            key={c.id}
            value={c.spent_cents}
            goal={c.budget_cents || 1}
            label={c.name}
            valueLabel={`${fmt(c.spent_cents)}/${fmt(c.budget_cents)}`}
          />
        ))}
        {budget.categories.length === 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'rgba(160,175,200,0.3)' }}>
            No budget categories yet. Add them in Finance → Budget.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Budget Snapshot Widget ───────────────────────────────────────────────────

export function BudgetSnapshotWidget({ widgetInstanceId }: WidgetProps) {
  const { data, loading, error } = useSummary();

  if (loading) return <Loading />;
  if (error || !data) return <Empty msg="Configure budget categories in Finance → Budget." />;

  const { budget } = data;
  const spentPct = budget.total_budget_cents > 0
    ? Math.min(100, Math.round((budget.total_spent_cents / budget.total_budget_cents) * 100))
    : 0;

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <Wallet size={11} style={{ color: '#00D4FF', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.4)' }}>
          Budget · {spentPct}% used
        </span>
      </div>

      <div className="shrink-0">
        <GlowBar
          value={budget.total_spent_cents}
          goal={budget.total_budget_cents || 1}
          label="Total Budget"
          valueLabel={`${fmt(budget.total_spent_cents)} / ${fmt(budget.total_budget_cents)}`}
          height={6}
        />
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto min-h-0">
        {budget.categories.map((c: any) => (
          <GlowBar
            key={c.id}
            value={c.spent_cents}
            goal={c.budget_cents || 1}
            label={c.name}
            valueLabel={`${fmt(c.spent_cents)} / ${fmt(c.budget_cents)}`}
          />
        ))}
        {budget.categories.length === 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'rgba(160,175,200,0.3)' }}>
            No categories yet.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Investing Snapshot Widget ────────────────────────────────────────────────

interface StockPrice { price: number | null; prevClose: number | null }

export function InvestingSnapshotWidget({ widgetInstanceId }: WidgetProps) {
  const { data, loading, error } = useSummary();
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [pricesLoaded, setPricesLoaded] = useState(false);

  useEffect(() => {
    if (!data?.investments?.length) { setPricesLoaded(true); return; }
    const tickers = data.investments.map((inv: any) => inv.ticker);
    Promise.all(
      tickers.map(t =>
        fetch(`/api/finance/stocks?ticker=${encodeURIComponent(t)}`)
          .then(r => r.json())
          .then(d => ({ ticker: t, price: d.price ?? null, prevClose: d.prevClose ?? null }))
          .catch(() => ({ ticker: t, price: null, prevClose: null }))
      )
    ).then(results => {
      const map: Record<string, StockPrice> = {};
      results.forEach(r => { map[r.ticker] = { price: r.price, prevClose: r.prevClose }; });
      setPrices(map);
      setPricesLoaded(true);
    });
  }, [data]);

  if (loading || !pricesLoaded) return <Loading />;
  if (error || !data) return <Empty msg="Add holdings in Finance → Investing." />;

  const holdings = data.investments.map((inv: any) => {
    const quote = prices[inv.ticker];
    const currentPrice = quote?.price ?? null;
    const costBasis = (inv.avg_cost_cents / 100) * inv.shares;
    const marketValue = currentPrice != null ? currentPrice * inv.shares : null;
    const gainLoss = marketValue != null ? marketValue - costBasis : null;
    const gainPct = costBasis > 0 && gainLoss != null ? (gainLoss / costBasis) * 100 : null;
    const dayChange = quote?.prevClose && currentPrice ? ((currentPrice - quote.prevClose) / quote.prevClose) * 100 : null;
    return { ...inv, currentPrice, marketValue, gainLoss, gainPct, dayChange };
  });

  const totalValue = holdings.reduce((s: number, h: any) => s + (h.marketValue ?? 0), 0);
  const totalCost = holdings.reduce((s: number, h: any) => s + (h.avg_cost_cents / 100) * h.shares, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <BarChart2 size={11} style={{ color: totalGain >= 0 ? '#10b981' : '#f87171', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(0,212,255,0.4)' }}>
          Portfolio
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 shrink-0">
        <div className="rounded-lg p-2.5" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.08)' }}>
          <MonoLabel>Total Value</MonoLabel>
          <BigNum value={totalValue > 0 ? `$${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'} />
        </div>
        <div className="rounded-lg p-2.5" style={{ background: totalGain >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(248,113,113,0.06)', border: `1px solid ${totalGain >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(248,113,113,0.15)'}` }}>
          <MonoLabel>Total Gain</MonoLabel>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: totalGain >= 0 ? '#10b981' : '#f87171', lineHeight: 1 }}>
            {totalGain >= 0 ? '+' : ''}{totalGain.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: totalGainPct >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(248,113,113,0.7)', marginTop: '3px' }}>
            {totalGainPct >= 0 ? '+' : ''}{totalGainPct.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto min-h-0">
        {holdings.map((h: any) => (
          <div key={h.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(0,212,255,0.05)' }}>
            <div className="min-w-0 flex-1">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 700, color: '#fff' }}>{h.ticker}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'rgba(160,175,200,0.4)' }}>{h.shares} shares</p>
            </div>
            <div className="text-right shrink-0">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                {h.marketValue != null ? `$${h.marketValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
              </p>
              {h.dayChange != null && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: h.dayChange >= 0 ? '#10b981' : '#f87171' }}>
                  {h.dayChange >= 0 ? '+' : ''}{h.dayChange.toFixed(2)}% today
                </p>
              )}
            </div>
            {h.gainPct != null && (
              <div className="ml-3 shrink-0 flex items-center gap-0.5" style={{ color: h.gainPct >= 0 ? '#10b981' : '#f87171' }}>
                {h.gainPct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem' }}>{Math.abs(h.gainPct).toFixed(1)}%</span>
              </div>
            )}
          </div>
        ))}
        {holdings.length === 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'rgba(160,175,200,0.3)' }}>No holdings yet.</p>
        )}
      </div>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Loading() {
  return (
    <div className="h-full flex items-center justify-center">
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'rgba(0,212,255,0.3)', letterSpacing: '0.12em' }}>LOADING…</div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(160,175,200,0.35)' }}>{msg}</p>
  );
}
