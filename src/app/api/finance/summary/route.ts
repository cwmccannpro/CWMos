import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const monthStr = thisMonthStart.toISOString().slice(0, 10);

  const [incomeRes, catsRes, txnsRes, investRes] = await Promise.all([
    supabase.from('income_sources').select('*').eq('user_id', user.id),
    supabase.from('budget_categories').select('*').eq('user_id', user.id).order('sort_order').order('created_at'),
    supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', monthStr).order('date', { ascending: false }),
    supabase.from('investments').select('*').eq('user_id', user.id),
  ]);

  if (incomeRes.error || catsRes.error || txnsRes.error || investRes.error) {
    const err = incomeRes.error ?? catsRes.error ?? txnsRes.error ?? investRes.error;
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }

  // Monthly income total
  const monthlyIncome = (incomeRes.data ?? []).reduce((sum, s) => {
    if (s.frequency === 'annual') return sum + Math.round(s.amount_cents / 12);
    if (s.frequency === 'one-time') return sum;
    return sum + s.amount_cents;
  }, 0);

  // Budget: spent per category this month
  const txns = txnsRes.data ?? [];
  const spent: Record<string, number> = {};
  let totalSpent = 0;
  for (const t of txns) {
    if (t.type === 'expense') {
      const key = t.category_id ?? '__uncategorized__';
      spent[key] = (spent[key] ?? 0) + t.amount_cents;
      totalSpent += t.amount_cents;
    }
  }

  const cats = (catsRes.data ?? []).map(c => ({
    ...c,
    spent_cents: spent[c.id] ?? 0,
  }));

  const totalBudget = cats.reduce((s, c) => s + c.budget_cents, 0);

  return NextResponse.json({
    income: {
      monthly_cents: monthlyIncome,
      sources: incomeRes.data ?? [],
    },
    budget: {
      total_budget_cents: totalBudget,
      total_spent_cents: totalSpent,
      categories: cats,
      month: monthStr,
    },
    investments: investRes.data ?? [],
  });
}
