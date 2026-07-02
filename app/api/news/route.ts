import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TICKERS = [
  'NVDA', 'AMD', 'SMCI', 'MSFT', 'GOOGL', 'META', 'AAPL', 'AMZN', 'TSLA',
  'PLTR', 'CRWD', 'NET', 'SNOW', 'IOT', 'HOOD', 'UPST', 'MQ', 'UNH',
  'TTD', 'FRSH', 'PATH', 'SOUN', 'VERI', 'BBAI', 'IREN', 'WULF', 'CLSK',
  'APLD', 'NVO', 'BAX', 'LYFT', 'WDC', 'TGLS',
];

export async function GET() {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'FINNHUB_API_KEY not set' }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const allNews = await Promise.all(
    TICKERS.map(async (ticker) => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${yesterday}&to=${today}&token=${key}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return [];
        const data: { id: number; headline: string; source: string; datetime: number }[] = await res.json();
        return (data || []).slice(0, 2).map((item, i) => ({
          id:       item.id || `${ticker}-${i}`,
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

  const flat = allNews.flat();
  return NextResponse.json(flat.slice(0, 25));
}
