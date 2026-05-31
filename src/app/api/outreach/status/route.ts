import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function resolveUser(req: NextRequest) {
  const bearerKey = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const supabase  = await createServerClient();
  const { data: integration } = await supabase
    .from('user_integrations')
    .select('user_id')
    .eq('provider', 'outreach-agent')
    .eq('enabled', true)
    .filter('credentials->>api_key', 'eq', bearerKey)
    .single();
  return { supabase, userId: integration?.user_id as string | null };
}

export async function GET(req: NextRequest) {
  const { supabase, userId } = await resolveUser(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Upsert row on first call
  await supabase.from('outreach_agent').upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });

  const { data: agent } = await supabase
    .from('outreach_agent').select('*').eq('user_id', userId).single();

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  // Reset counter if it's a new day
  const today = new Date().toISOString().slice(0, 10);
  if (agent.last_reset < today) {
    await supabase.from('outreach_agent')
      .update({ sends_today: 0, last_reset: today })
      .eq('user_id', userId);
    agent.sends_today = 0;
  }

  // 7-day metrics
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: runs } = await supabase
    .from('outreach_runs')
    .select('claude_cost_usd, emails_sent')
    .eq('user_id', userId)
    .gte('run_at', sevenDaysAgo);

  const cost7d   = runs?.reduce((s, r) => s + Number(r.claude_cost_usd ?? 0), 0) ?? 0;
  const emails7d = runs?.reduce((s, r) => s + (r.emails_sent ?? 0), 0) ?? 0;

  return NextResponse.json({
    enabled:      agent.enabled,
    sends_today:  agent.sends_today,
    daily_limit:  agent.daily_limit,
    niches:       agent.niches ?? [],
    cost_7d_usd:  cost7d,
    emails_7d:    emails7d,
  });
}
