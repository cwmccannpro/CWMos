import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function resolveUser(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader.startsWith('Bearer ')) {
    const supabase = await createServerClient();
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('user_id')
      .eq('provider', 'outreach-agent')
      .eq('enabled', true)
      .filter('credentials->>api_key', 'eq', authHeader.slice(7))
      .single();
    if (!integration) return { supabase, userId: null };
    return { supabase, userId: integration.user_id as string };
  }
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

// GET — web UI fetches recent runs
export async function GET(req: NextRequest) {
  const { supabase, userId } = await resolveUser(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('outreach_runs')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST — Python agent creates a new run record at start
export async function POST(req: NextRequest) {
  const { supabase, userId } = await resolveUser(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { data, error } = await supabase
    .from('outreach_runs')
    .insert({
      user_id:     userId,
      emails_sent: body.emails_sent ?? 0,
      leads_found: body.leads_found ?? 0,
      status:      body.status ?? 'running',
      notes:       body.notes ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH — Python agent updates run on completion
export async function PATCH(req: NextRequest) {
  const { supabase, userId } = await resolveUser(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { id, ...fields } = body;
  if (!fields.completed_at && fields.status !== 'running') {
    fields.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('outreach_runs')
    .update(fields)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
