'use client';

import { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, TrendingDown, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Holding { id: string; ticker: string; name: string | null; shares: number; avg_cost_cents: number }
interface Quote { price: number | null; prevClose: number | null; currency: string }

export default function InvestingPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [ticker, setTicker] = useState('');
  const [holdingName, setHoldingName] = useState('');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');

  async function loadHoldings() {
    const res = await fetch('/api/finance/investments');
    if (res.ok) setHoldings(await res.json());
    setLoading(false);
  }

  async function fetchQuotes(h: Holding[]) {
    if (!h.length) return;
    setQuotesLoading(true);
    const results = await Promise.all(
      h.map(inv =>
        fetch(`/api/finance/stocks?ticker=${encodeURIComponent(inv.ticker)}`)
          .then(r => r.json())
          .then(d => ({ ticker: inv.ticker, price: d.price ?? null, prevClose: d.prevClose ?? null, currency: d.currency ?? 'USD' }))
          .catch(() => ({ ticker: inv.ticker, price: null, prevClose: null, currency: 'USD' }))
      )
    );
    const map: Record<string, Quote> = {};
    results.forEach(r => { map[r.ticker] = { price: r.price, prevClose: r.prevClose, currency: r.currency }; });
    setQuotes(map);
    setQuotesLoading(false);
  }

  useEffect(() => {
    loadHoldings();
  }, []);

  // Fetch quotes on initial holdings load, then refresh every 60 seconds
  useEffect(() => {
    if (holdings.length === 0) return;
    fetchQuotes(holdings);
    const iv = setInterval(() => fetchQuotes(holdings), 60_000);
    return () => clearInterval(iv);
  }, [holdings]);

  async function addHolding() {
    if (!ticker || !shares || !avgCost) return;
    await fetch('/api/finance/investments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker: ticker.toUpperCase(),
        name: holdingName || null,
        shares: parseFloat(shares),
        avg_cost_cents: Math.round(parseFloat(avgCost) * 100),
      }),
    });
    setTicker(''); setHoldingName(''); setShares(''); setAvgCost(''); setShowForm(false);
    loadHoldings();
  }

  async function deleteHolding(id: string) {
    await fetch(`/api/finance/investments?id=${id}`, { method: 'DELETE' });
    loadHoldings();
  }

  const enriched = holdings.map(h => {
    const q = quotes[h.ticker];
    const currentPrice = q?.price ?? null;
    const costBasis = (h.avg_cost_cents / 100) * h.shares;
    const marketValue = currentPrice != null ? currentPrice * h.shares : null;
    const gainLoss = marketValue != null ? marketValue - costBasis : null;
    const gainPct = costBasis > 0 && gainLoss != null ? (gainLoss / costBasis) * 100 : null;
    const dayChange = q?.prevClose && currentPrice ? ((currentPrice - q.prevClose) / q.prevClose) * 100 : null;
    return { ...h, currentPrice, marketValue, gainLoss, gainPct, dayChange };
  });

  const totalValue = enriched.reduce((s, h) => s + (h.marketValue ?? 0), 0);
  const totalCost = enriched.reduce((s, h) => s + (h.avg_cost_cents / 100) * h.shares, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  function fmtUSD(n: number) {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (loading) return <div className="p-6 space-y-4 animate-pulse"><div className="h-32 bg-zinc-800 rounded-xl" /></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-emerald-400" />
          <h1 className="text-zinc-100 font-semibold">Investing</h1>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-300 text-xs transition-colors">
          <Plus size={13} /> Add holding
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Portfolio summary */}
        {holdings.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Portfolio Value</p>
              <p className="text-zinc-100 text-2xl font-bold tabular-nums">
                {totalValue > 0 ? fmtUSD(totalValue) : quotesLoading ? '…' : '—'}
              </p>
            </div>
            <div className={cn('border rounded-xl p-4', totalGain >= 0 ? 'bg-emerald-950/30 border-emerald-800/30' : 'bg-rose-950/30 border-rose-800/30')}>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Total Gain/Loss</p>
              <p className={cn('text-2xl font-bold tabular-nums', totalGain >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                {totalGain >= 0 ? '+' : ''}{fmtUSD(totalGain)}
              </p>
              <p className={cn('text-xs mt-0.5', totalGainPct >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                {totalGainPct >= 0 ? '+' : ''}{totalGainPct.toFixed(2)}%
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Cost Basis</p>
              <p className="text-zinc-100 text-2xl font-bold tabular-nums">{fmtUSD(totalCost)}</p>
            </div>
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Add Holding</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="Ticker (e.g. AAPL)" className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 font-mono uppercase" />
              <input value={holdingName} onChange={e => setHoldingName(e.target.value)} placeholder="Name (optional)" className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500" />
              <input value={shares} onChange={e => setShares(e.target.value)} type="number" placeholder="Shares" className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500" />
              <input value={avgCost} onChange={e => setAvgCost(e.target.value)} type="number" placeholder="Avg cost per share ($)" className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={addHolding} className="px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-500 transition-colors">Add</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs rounded-lg hover:bg-zinc-700 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Holdings table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_auto] gap-x-4 px-4 py-2 border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-wider">
            <span>Ticker</span>
            <span>Shares</span>
            <span>Avg Cost</span>
            <span>Price</span>
            <span>Market Value</span>
            <span>Gain/Loss</span>
            <span />
          </div>

          {enriched.length === 0 ? (
            <p className="px-4 py-8 text-center text-zinc-600 text-sm">No holdings yet. Add your first position above.</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {enriched.map(h => (
                <div key={h.id} className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_auto] gap-x-4 px-4 py-3 hover:bg-zinc-800/30 transition-colors group items-center">
                  <div>
                    <p className="text-zinc-100 text-sm font-bold font-mono">{h.ticker}</p>
                    {h.name && <p className="text-zinc-600 text-[10px] truncate max-w-[80px]">{h.name}</p>}
                  </div>
                  <span className="text-zinc-300 text-xs tabular-nums">{h.shares}</span>
                  <span className="text-zinc-300 text-xs tabular-nums">{fmtUSD(h.avg_cost_cents / 100)}</span>
                  <span className="text-zinc-300 text-xs tabular-nums">
                    {h.currentPrice != null ? fmtUSD(h.currentPrice) : quotesLoading ? '…' : '—'}
                    {h.dayChange != null && (
                      <span className={cn('block text-[10px]', h.dayChange >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                        {h.dayChange >= 0 ? '+' : ''}{h.dayChange.toFixed(2)}%
                      </span>
                    )}
                  </span>
                  <span className="text-zinc-300 text-xs tabular-nums">
                    {h.marketValue != null ? fmtUSD(h.marketValue) : '—'}
                  </span>
                  <div>
                    {h.gainLoss != null ? (
                      <>
                        <p className={cn('text-xs tabular-nums flex items-center gap-0.5', h.gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                          {h.gainLoss >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {h.gainLoss >= 0 ? '+' : ''}{fmtUSD(h.gainLoss)}
                        </p>
                        {h.gainPct != null && (
                          <p className={cn('text-[10px]', h.gainPct >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                            {h.gainPct >= 0 ? '+' : ''}{h.gainPct.toFixed(2)}%
                          </p>
                        )}
                      </>
                    ) : '—'}
                  </div>
                  <button onClick={() => deleteHolding(h.id)} className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-rose-400 transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-zinc-700 text-xs">Prices sourced from Yahoo Finance. May be delayed 15–20 minutes.</p>
      </div>
    </div>
  );
}
