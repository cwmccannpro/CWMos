import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ticker = req.nextUrl.searchParams.get('ticker')?.toUpperCase();
  if (!ticker) return NextResponse.json({ error: 'Missing ticker' }, { status: 400 });

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`Yahoo returned ${res.status}`);
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('No data returned from Yahoo Finance');
    return NextResponse.json({
      ticker: meta.symbol ?? ticker,
      price: meta.regularMarketPrice ?? null,
      prevClose: meta.chartPreviousClose ?? null,
      currency: meta.currency ?? 'USD',
    });
  } catch (err: any) {
    console.error('[finance/stocks]', ticker, err.message);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
