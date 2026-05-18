import { NextResponse } from 'next/server';
import { getUserCredentials } from '@/lib/integrations';

const BASE = 'https://api.trello.com/1';
type TrelloLabel = { id: string; name: string; color: string };

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { userId, credentials } = await getUserCredentials('trello');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!credentials) return NextResponse.json({ error: 'Trello not connected' }, { status: 503 });

  const { api_key: KEY, token: TOKEN } = credentials as { api_key: string; token: string };
  const { cardId } = await params;
  const body = await req.json();

  const url = new URL(`${BASE}/cards/${cardId}`);
  url.searchParams.set('key', KEY);
  url.searchParams.set('token', TOKEN);
  if (body.name !== undefined) url.searchParams.set('name', body.name);
  if (body.desc !== undefined) url.searchParams.set('desc', body.desc);
  if (body.idList !== undefined) url.searchParams.set('idList', body.idList);
  if (body.due !== undefined) url.searchParams.set('due', body.due);

  const res = await fetch(url.toString(), { method: 'PUT' });
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });

  const c = await res.json();
  return NextResponse.json({
    id: c.id, name: c.name, desc: c.desc, listId: c.idList,
    boardId: c.idBoard, due: c.due, url: c.shortUrl,
    labels: (c.labels as TrelloLabel[]).map(l => l.name).filter(Boolean),
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { userId, credentials } = await getUserCredentials('trello');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!credentials) return NextResponse.json({ error: 'Trello not connected' }, { status: 503 });

  const { api_key: KEY, token: TOKEN } = credentials as { api_key: string; token: string };
  const { cardId } = await params;

  const url = new URL(`${BASE}/cards/${cardId}`);
  url.searchParams.set('key', KEY);
  url.searchParams.set('token', TOKEN);
  url.searchParams.set('closed', 'true');

  const res = await fetch(url.toString(), { method: 'PUT' });
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
  return NextResponse.json({ success: true });
}
