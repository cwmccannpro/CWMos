import { NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('user_integrations')
    .select('provider, credentials, enabled, updated_at')
    .eq('user_id', user.id);

  return NextResponse.json(data ?? []);
}

export async function PUT(req: Request) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { provider, credentials, enabled = true } = body;
  if (!provider) return NextResponse.json({ error: 'provider is required' }, { status: 400 });

  const { error } = await supabase
    .from('user_integrations')
    .upsert(
      { user_id: user.id, provider, credentials, enabled, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,provider' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
