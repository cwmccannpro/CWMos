import { NextResponse } from 'next/server';

const KEY = process.env.TRELLO_API_KEY;
const TOKEN = process.env.TRELLO_TOKEN;
const BASE = 'https://api.trello.com/1';

function authParams() {
  return `key=${KEY}&token=${TOKEN}`;
}

type TrelloLabel = { id: string; name: string; color: string };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ listId: string }> }
) {
  if (!KEY || !TOKEN) {
    return NextResponse.json({ error: 'Trello credentials not configured' }, { status: 500 });
  }

  const { listId } = await params;
  const res = await fetch(
    `${BASE}/lists/${listId}/cards?fields=id,name,desc,idList,idBoard,due,shortUrl,labels&${authParams()}`
  );
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json();
  const cards = data.map((c: {
    id: string; name: string; desc: string; idList: string;
    idBoard: string; due: string | null; shortUrl: string; labels: TrelloLabel[];
  }) => ({
    id: c.id,
    name: c.name,
    desc: c.desc,
    listId: c.idList,
    boardId: c.idBoard,
    due: c.due,
    url: c.shortUrl,
    labels: c.labels.map((l) => l.name).filter(Boolean),
  }));

  return NextResponse.json(cards);
}
