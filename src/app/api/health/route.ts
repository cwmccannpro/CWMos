import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

// Per-user health data (supplements, fitness schedule, supplement log) stored
// as a single JSON blob in `user_health.data`, keyed by user_id. Mirrors the
// dashboard-layout persistence pattern so data syncs across devices/environments.

export async function GET() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('user_health')
    .select('data')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json({ data: data?.data ?? null });
}

export async function PUT(req: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.data || typeof body.data !== 'object') {
    return NextResponse.json({ error: 'data must be an object' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_health')
    .upsert({ user_id: user.id, data: body.data }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
