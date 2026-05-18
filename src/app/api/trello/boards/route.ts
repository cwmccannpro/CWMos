import { NextResponse } from 'next/server';
import { getUserCredentials } from '@/lib/integrations';

const BASE = 'https://api.trello.com/1';

export async function GET() {
  const { userId, credentials } = await getUserCredentials('trello');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!credentials) return NextResponse.json({ error: 'Trello not connected' }, { status: 503 });

  const { api_key: KEY, token: TOKEN } = credentials as { api_key: string; token: string };
  const res = await fetch(`${BASE}/members/me/boards?filter=open&fields=id,name,shortUrl&key=${KEY}&token=${TOKEN}`);
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });

  const data = await res.json();
  return NextResponse.json(
    data.map((b: { id: string; name: string; shortUrl: string }) => ({ id: b.id, name: b.name, url: b.shortUrl }))
  );
}
