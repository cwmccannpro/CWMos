import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function getUser() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.column_id || !body?.project_id || !body?.title)
    return NextResponse.json({ error: 'column_id, project_id, title required' }, { status: 400 });
  const { data, error } = await supabase.from('board_cards')
    .insert({
      column_id: body.column_id, project_id: body.project_id, user_id: user.id,
      title: body.title, description: body.description ?? null,
      priority: body.priority ?? 'medium', due_date: body.due_date ?? null,
      tags: body.tags ?? [], assignee: body.assignee ?? null,
      position: body.position ?? 0,
    })
    .select('*, card_checklist_items(*), card_comments(*)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Bulk position update: { positions: [{id, column_id, position}] }
  if (body.positions) {
    const updates = await Promise.all(
      body.positions.map((p: { id: string; column_id: string; position: number }) =>
        supabase.from('board_cards')
          .update({ column_id: p.column_id, position: p.position })
          .eq('id', p.id).eq('user_id', user.id)
      )
    );
    const err = updates.find(u => u.error);
    if (err?.error) return NextResponse.json({ error: err.error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { id, ...fields } = body;
  const { data, error } = await supabase.from('board_cards')
    .update(fields).eq('id', id).eq('user_id', user.id)
    .select('*, card_checklist_items(*), card_comments(*)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await supabase.from('board_cards').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
