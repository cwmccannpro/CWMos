import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// GET: returns { categories, transactions }
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [cats, txns] = await Promise.all([
    supabase.from('budget_categories').select('*').eq('user_id', user.id).order('sort_order').order('created_at'),
    supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(200),
  ]);

  if (cats.error) return NextResponse.json({ error: cats.error.message }, { status: 500 });
  if (txns.error) return NextResponse.json({ error: txns.error.message }, { status: 500 });

  return NextResponse.json({ categories: cats.data ?? [], transactions: txns.data ?? [] });
}

// POST: upsert a category or create a transaction
// body: { type: 'category' | 'transaction', ...fields }
export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.type) return NextResponse.json({ error: 'type required' }, { status: 400 });

  if (body.type === 'category') {
    if (!body.name || body.budget_cents == null)
      return NextResponse.json({ error: 'name and budget_cents required' }, { status: 400 });
    const row = { user_id: user.id, name: body.name, budget_cents: body.budget_cents, color: body.color ?? '#00D4FF' };
    const { data, error } = body.id
      ? await supabase.from('budget_categories').update(row).eq('id', body.id).eq('user_id', user.id).select().single()
      : await supabase.from('budget_categories').insert(row).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: body.id ? 200 : 201 });
  }

  if (body.type === 'transaction') {
    if (!body.description || body.amount_cents == null || !body.date)
      return NextResponse.json({ error: 'description, amount_cents, and date required' }, { status: 400 });
    const row = {
      user_id: user.id,
      category_id: body.category_id ?? null,
      description: body.description,
      amount_cents: body.amount_cents,
      type: body.txn_type ?? 'expense',
      date: body.date,
    };
    const { data, error } = await supabase.from('transactions').insert(row).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const table = req.nextUrl.searchParams.get('table'); // 'category' | 'transaction'
  const id = req.nextUrl.searchParams.get('id');
  if (!id || !table) return NextResponse.json({ error: 'id and table required' }, { status: 400 });

  const tableName = table === 'category' ? 'budget_categories' : 'transactions';
  const { error } = await supabase.from(tableName as any).delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
