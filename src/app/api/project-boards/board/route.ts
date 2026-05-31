import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/project-boards/board?project_id=... → { columns, cards, checklists, comments }
export async function GET(req: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get('project_id');
  if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 });

  const [colRes, cardRes] = await Promise.all([
    supabase.from('board_columns').select('*')
      .eq('project_id', projectId).eq('user_id', user.id).order('position'),
    supabase.from('board_cards').select('*, card_checklist_items(*), card_comments(*)')
      .eq('project_id', projectId).eq('user_id', user.id).eq('archived', false).order('position'),
  ]);

  if (colRes.error)  return NextResponse.json({ error: colRes.error.message },  { status: 500 });
  if (cardRes.error) return NextResponse.json({ error: cardRes.error.message }, { status: 500 });

  return NextResponse.json({ columns: colRes.data ?? [], cards: cardRes.data ?? [] });
}
