import { NextResponse } from 'next/server';

const KEY = process.env.TRELLO_API_KEY;
const TOKEN = process.env.TRELLO_TOKEN;
const BASE = 'https://api.trello.com/1';

function authParams() {
  return `key=${KEY}&token=${TOKEN}`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  if (!KEY || !TOKEN) {
    return NextResponse.json({ error: 'Trello credentials not configured' }, { status: 500 });
  }

  const { boardId } = await params;
  const res = await fetch(`${BASE}/boards/${boardId}/lists?fields=id,name,idBoard,pos&${authParams()}`);
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json();
  const lists = data.map((l: { id: string; name: string; idBoard: string; pos: number }) => ({
    id: l.id,
    name: l.name,
    boardId: l.idBoard,
    position: l.pos,
  }));

  return NextResponse.json(lists);
}
