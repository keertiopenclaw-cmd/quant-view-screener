import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TICKERS = ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'META', 'TSLA', 'AMZN', 'AMD', 'PLTR', 'BT-A.L'];

export async function GET() {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'FINNHUB_API_KEY not set' }, { status: 500 });
  }

  const now   = Math.floor(Date.now() / 1000);
  const since = now - 86400; // last 24 hours

  const allNews = await Promise.all(
    TICKERS.map(async (ticker) => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${new Date(since * 1000).toISOString().slice(0,10)}&to=${new Date(now * 1000).toISOString().slice(0,10)}&token=${key}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return [];
        const data: { id: number; headline: string; source: string; datetime: number }[] = await res.json();
        return (data || []).slice(0, 2).map((item, i) => ({
          id:       item.id || ticker + i,
          ticker,
          headline: item.headline,
          source:   item.source,
          time:     new Date(item.datetime * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        }));
      } catch {
        return [];
      }
    })
  );

  const flat = allNews.flat().sort((a, b) => {
    // sort by time descending — use original datetime via re-fetch order (already newest first from Finnhub)
    return 0;
  });

  return NextResponse.json(flat.slice(0, 20));
}
