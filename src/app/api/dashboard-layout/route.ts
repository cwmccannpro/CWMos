import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('user_dashboard_layouts')
    .select('layout')
    .eq('user_id', user.id)
    .single();

  return NextResponse.json({ layout: data?.layout ?? null });
}

export async function PUT(req: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!Array.isArray(body.layout)) {
    return NextResponse.json({ error: 'layout must be an array' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_dashboard_layouts')
    .upsert({ user_id: user.id, layout: body.layout }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
