import { NextResponse } from 'next/server';
import { getUserCredentials } from '@/lib/integrations';

const BASE = 'https://api.trello.com/1';
type TrelloLabel = { id: string; name: string; color: string };

export async function POST(req: Request) {
  const { userId, credentials } = await getUserCredentials('trello');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!credentials) return NextResponse.json({ error: 'Trello not connected' }, { status: 503 });

  const { api_key: KEY, token: TOKEN } = credentials as { api_key: string; token: string };
  const body = await req.json();
  const { name, listId, desc, due } = body;

  const url = new URL(`${BASE}/cards`);
  url.searchParams.set('key', KEY);
  url.searchParams.set('token', TOKEN);
  url.searchParams.set('idList', listId);
  url.searchParams.set('name', name);
  if (desc) url.searchParams.set('desc', desc);
  if (due) url.searchParams.set('due', due);

  const res = await fetch(url.toString(), { method: 'POST' });
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });

  const c = await res.json();
  return NextResponse.json({
    id: c.id, name: c.name, desc: c.desc, listId: c.idList,
    boardId: c.idBoard, due: c.due, url: c.shortUrl,
    labels: (c.labels as TrelloLabel[]).map(l => l.name).filter(Boolean),
  });
}
