'use client';

import { useEffect, useState } from 'react';
import { Wallet, Plus, Trash2, Tag } from 'lucide-react';
import { GlowBar } from '@/components/ui/GlowBar';

interface Category { id: string; name: string; budget_cents: number; color: string; spent_cents: number }
interface Transaction { id: string; category_id: string | null; description: string; amount_cents: number; type: string; date: string }

function fmt(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

const CATEGORY_COLORS = ['#00D4FF', '#8B5CF6', '#F59E0B', '#10b981', '#f97316', '#ef4444', '#ec4899', '#6366f1'];

export default function BudgetPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [catBudget, setCatBudget] = useState('');
  const [catColor, setCatColor] = useState(CATEGORY_COLORS[0]);

  // Transaction form
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [txnDesc, setTxnDesc] = useState('');
  const [txnAmt, setTxnAmt] = useState('');
  const [txnCat, setTxnCat] = useState('');
  const [txnDate, setTxnDate] = useState(new Date().toISOString().slice(0, 10));
  const [txnType, setTxnType] = useState('expense');

  async function load() {
    const res = await fetch('/api/finance/budget');
    if (res.ok) {
      const d = await res.json();
      setCats(d.categories ?? []);
      setTxns(d.transactions ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addCategory() {
    if (!catName || !catBudget) return;
    await fetch('/api/finance/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'category', name: catName, budget_cents: Math.round(parseFloat(catBudget) * 100), color: catColor }),
    });
    setCatName(''); setCatBudget(''); setShowCatForm(false);
    load();
  }

  async function addTransaction() {
    if (!txnDesc || !txnAmt || !txnDate) return;
    await fetch('/api/finance/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'transaction',
        description: txnDesc,
        amount_cents: Math.round(parseFloat(txnAmt) * 100),
        category_id: txnCat || null,
        date: txnDate,
        txn_type: txnType,
      }),
    });
    setTxnDesc(''); setTxnAmt(''); setShowTxnForm(false);
    load();
  }

  async function deleteItem(table: 'category' | 'transaction', id: string) {
    await fetch(`/api/finance/budget?table=${table}&id=${id}`, { method: 'DELETE' });
    load();
  }

  const catMap = Object.fromEntries(cats.map(c => [c.id, c]));

  if (loading) return <div className="p-6 space-y-4 animate-pulse">{[1, 2].map(i => <div key={i} className="h-32 bg-zinc-800 rounded-xl" />)}</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-violet-400" />
          <h1 className="text-zinc-100 font-semibold">Budget</h1>
        </div>
        <span className="text-zinc-600 text-xs">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Categories */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Tag size={13} className="text-zinc-500" />
              <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Categories</span>
            </div>
            <button onClick={() => setShowCatForm(v => !v)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
              <Plus size={14} />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {showCatForm && (
              <div className="space-y-2 pb-3 border-b border-zinc-800">
                <div className="grid grid-cols-2 gap-2">
                  <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category name" className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500" />
                  <input value={catBudget} onChange={e => setCatBudget(e.target.value)} type="number" placeholder="Monthly budget ($)" className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-xs">Color:</span>
                  {CATEGORY_COLORS.map(c => (
                    <button key={c} onClick={() => setCatColor(c)} className="w-5 h-5 rounded-full transition-transform" style={{ background: c, transform: catColor === c ? 'scale(1.3)' : 'scale(1)' }} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={addCategory} className="px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-500 transition-colors">Add</button>
                  <button onClick={() => setShowCatForm(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs rounded-lg hover:bg-zinc-700 transition-colors">Cancel</button>
                </div>
              </div>
            )}

            {cats.length === 0 && !showCatForm && (
              <p className="text-zinc-600 text-sm text-center py-4">No categories yet. Add one to start tracking your budget.</p>
            )}

            {cats.map(c => (
              <div key={c.id} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                    <span className="text-zinc-300 text-sm">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400 text-xs tabular-nums">{fmt(c.spent_cents)} / {fmt(c.budget_cents)}</span>
                    <button onClick={() => deleteItem('category', c.id)} className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-rose-400 transition-all">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                <GlowBar value={c.spent_cents} goal={c.budget_cents || 1} />
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <span className="text-zinc-400 text-xs font-medium uppercase tracking-wider">Transactions This Month</span>
            <button onClick={() => setShowTxnForm(v => !v)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
              <Plus size={14} />
            </button>
          </div>

          {showTxnForm && (
            <div className="p-4 border-b border-zinc-800 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input value={txnDesc} onChange={e => setTxnDesc(e.target.value)} placeholder="Description" className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500" />
                <input value={txnAmt} onChange={e => setTxnAmt(e.target.value)} type="number" placeholder="Amount ($)" className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select value={txnCat} onChange={e => setTxnCat(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500">
                  <option value="">No category</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input value={txnDate} onChange={e => setTxnDate(e.target.value)} type="date" className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500" />
                <select value={txnType} onChange={e => setTxnType(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500">
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={addTransaction} className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-500 transition-colors">Add</button>
                <button onClick={() => setShowTxnForm(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 text-xs rounded-lg hover:bg-zinc-700 transition-colors">Cancel</button>
              </div>
            </div>
          )}

          <div className="divide-y divide-zinc-800">
            {txns.length === 0 && (
              <p className="px-4 py-6 text-center text-zinc-600 text-sm">No transactions this month.</p>
            )}
            {txns.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200 text-sm truncate">{t.description}</p>
                  <p className="text-zinc-600 text-xs">{t.date} {t.category_id && catMap[t.category_id] ? `· ${catMap[t.category_id].name}` : ''}</p>
                </div>
                <p className={`text-sm font-semibold tabular-nums shrink-0 ${t.type === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {t.type === 'expense' ? '-' : '+'}{fmt(t.amount_cents)}
                </p>
                <button onClick={() => deleteItem('transaction', t.id)} className="opacity-0 group-hover:opacity-100 text-zinc-700 hover:text-rose-400 transition-all shrink-0">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
