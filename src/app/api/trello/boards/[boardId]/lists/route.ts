import { NextResponse } from 'next/server';
import { getUserCredentials } from '@/lib/integrations';

const BASE = 'https://api.trello.com/1';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { userId, credentials } = await getUserCredentials('trello');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!credentials) return NextResponse.json({ error: 'Trello not connected' }, { status: 503 });

  const { api_key: KEY, token: TOKEN } = credentials as { api_key: string; token: string };
  const { boardId } = await params;
  const res = await fetch(`${BASE}/boards/${boardId}/lists?fields=id,name,idBoard,pos&key=${KEY}&token=${TOKEN}`);
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });

  const data = await res.json();
  return NextResponse.json(
    data.map((l: { id: string; name: string; idBoard: string; pos: number }) => ({
      id: l.id, name: l.name, boardId: l.idBoard, position: l.pos,
    }))
  );
}
