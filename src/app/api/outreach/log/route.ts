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

export async function POST(req: NextRequest) {
  const { supabase, userId } = await resolveUser(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // Insert run record
  const { error: insertErr } = await supabase.from('outreach_runs').insert({
    user_id:         userId,
    action:          body.action ?? null,
    lead_name:       body.lead_name ?? null,
    lead_email:      body.lead_email ?? null,
    niche:           body.niche ?? null,
    city:            body.city ?? null,
    claude_cost_usd: body.claude_cost_usd ?? 0,
    emails_sent:     body.emails_sent ?? 0,
  });
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Atomically increment sends_today counter if emails were sent
  if ((body.emails_sent ?? 0) > 0) {
    await supabase.rpc('increment_sends_today', {
      p_user_id: userId,
      p_count:   body.emails_sent,
    });
  }

  return NextResponse.json({ ok: true });
}
