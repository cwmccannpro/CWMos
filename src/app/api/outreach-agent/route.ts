import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Resolve user from session cookie OR Bearer token (same pattern as nutrition log)
async function resolveUser(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader.startsWith('Bearer ')) {
    const bearerKey = authHeader.slice(7);
    const supabase  = await createServerClient();
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('user_id')
      .eq('provider', 'outreach-agent')
      .eq('enabled', true)
      .filter('credentials->>api_key', 'eq', bearerKey)
      .single();
    if (!integration) return { supabase, userId: null };
    return { supabase, userId: integration.user_id as string };
  }
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

// GET — returns agent state; Python agent calls this to check if enabled + quota
export async function GET(req: NextRequest) {
  const { supabase, userId } = await resolveUser(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Upsert defaults on first fetch
  await supabase.from('outreach_agent').upsert(
    { user_id: userId },
    { onConflict: 'user_id', ignoreDuplicates: true }
  );

  const { data, error } = await supabase
    .from('outreach_agent')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-reset daily counter if stale
  if (data.last_reset_date < new Date().toISOString().slice(0, 10)) {
    await supabase.from('outreach_agent')
      .update({ emails_today: 0, last_reset_date: new Date().toISOString().slice(0, 10) })
      .eq('user_id', userId);
    data.emails_today = 0;
  }

  return NextResponse.json({
    enabled:         data.enabled,
    daily_limit:     data.daily_limit,
    batch_size:      data.batch_size,
    emails_today:    data.emails_today,
    last_reset_date: data.last_reset_date,
    can_send:        data.enabled && data.emails_today < data.daily_limit,
    remaining:       Math.max(0, data.daily_limit - data.emails_today),
  });
}

// POST — update agent config (web UI only, session auth)
export async function POST(req: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const fields: Record<string, unknown> = {};
  if (typeof body.enabled    === 'boolean') fields.enabled    = body.enabled;
  if (typeof body.daily_limit === 'number') fields.daily_limit = body.daily_limit;
  if (typeof body.batch_size  === 'number') fields.batch_size  = body.batch_size;

  const { data, error } = await supabase.from('outreach_agent')
    .upsert({ user_id: user.id, ...fields }, { onConflict: 'user_id' })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
