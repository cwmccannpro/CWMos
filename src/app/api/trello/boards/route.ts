import { NextResponse } from 'next/server';

const KEY = process.env.TRELLO_API_KEY;
const TOKEN = process.env.TRELLO_TOKEN;
const BASE = 'https://api.trello.com/1';

function authParams() {
  return `key=${KEY}&token=${TOKEN}`;
}

export async function GET() {
  if (!KEY || !TOKEN) {
    return NextResponse.json({ error: 'Trello credentials not configured' }, { status: 500 });
  }

  const res = await fetch(`${BASE}/members/me/boards?filter=open&fields=id,name,shortUrl&${authParams()}`);
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json();
  const boards = data.map((b: { id: string; name: string; shortUrl: string }) => ({
    id: b.id,
    name: b.name,
    url: b.shortUrl,
  }));

  return NextResponse.json(boards);
}
