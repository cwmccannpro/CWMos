import { NextResponse } from 'next/server';
import { getUserCredentials } from '@/lib/integrations';

const BASE = 'https://api.trello.com/1';
type TrelloLabel = { id: string; name: string; color: string };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  const { userId, credentials } = await getUserCredentials('trello');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!credentials) return NextResponse.json({ error: 'Trello not connected' }, { status: 503 });

  const { api_key: KEY, token: TOKEN } = credentials as { api_key: string; token: string };
  const { listId } = await params;
  const res = await fetch(
    `${BASE}/lists/${listId}/cards?fields=id,name,desc,idList,idBoard,due,shortUrl,labels&key=${KEY}&token=${TOKEN}`
  );
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });

  const data = await res.json();
  return NextResponse.json(
    data.map((c: { id: string; name: string; desc: string; idList: string; idBoard: string; due: string | null; shortUrl: string; labels: TrelloLabel[] }) => ({
      id: c.id, name: c.name, desc: c.desc, listId: c.idList,
      boardId: c.idBoard, due: c.due, url: c.shortUrl,
      labels: c.labels.map(l => l.name).filter(Boolean),
    }))
  );
}
