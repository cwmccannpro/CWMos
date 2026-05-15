import { NextResponse } from 'next/server';

const KEY = process.env.TRELLO_API_KEY;
const TOKEN = process.env.TRELLO_TOKEN;
const BASE = 'https://api.trello.com/1';

function authParams() {
  return `key=${KEY}&token=${TOKEN}`;
}

type TrelloLabel = { id: string; name: string; color: string };

export async function POST(req: Request) {
  if (!KEY || !TOKEN) {
    return NextResponse.json({ error: 'Trello credentials not configured' }, { status: 500 });
  }

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
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const c = await res.json();
  return NextResponse.json({
    id: c.id,
    name: c.name,
    desc: c.desc,
    listId: c.idList,
    boardId: c.idBoard,
    due: c.due,
    url: c.shortUrl,
    labels: (c.labels as TrelloLabel[]).map((l) => l.name).filter(Boolean),
  });
}
