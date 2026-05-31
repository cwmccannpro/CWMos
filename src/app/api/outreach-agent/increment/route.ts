import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST — called by Python agent after each email batch to increment counter atomically
// Authorization: Bearer <api_key>
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer '))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bearerKey = authHeader.slice(7);
  const supabase  = await createServerClient();

  const { data: integration } = await supabase
    .from('user_integrations')
    .select('user_id')
    .eq('provider', 'outreach-agent')
    .eq('enabled', true)
    .filter('credentials->>api_key', 'eq', bearerKey)
    .single();

  if (!integration) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body  = await req.json().catch(() => ({}));
  const count = typeof body.count === 'number' ? body.count : 1;

  const { data, error } = await supabase.rpc('increment_outreach_emails', {
    p_user_id: integration.user_id,
    p_count:   count,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    emails_today: row.emails_today,
    daily_limit:  row.daily_limit,
    can_send:     row.can_send,
    remaining:    Math.max(0, row.daily_limit - row.emails_today),
  });
}
