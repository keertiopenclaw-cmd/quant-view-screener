import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_TICKERS = [
  'NVDA','AMD','SMCI','MSFT','GOOGL','META','AAPL','AMZN','TSLA',
  'PLTR','CRWD','NET','SNOW','IOT','HOOD','UPST','MQ','UNH',
  'TTD','FRSH','PATH','SOUN','VERI','BBAI','IREN','WULF','CLSK',
  'APLD','NVO','BAX','LYFT','WDC','TGLS',
];

export async function GET(request: Request) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return NextResponse.json({ error: 'FINNHUB_API_KEY not set' }, { status: 500 });

  const url = new URL(request.url);
  const ticker = url.searchParams.get('ticker');
  const tickers = ticker ? [ticker] : DEFAULT_TICKERS.slice(0, 15); // limit to 15 for rate limit

  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const allNews = await Promise.all(
    tickers.map(async (t) => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(t)}&from=${yesterday}&to=${today}&token=${key}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return [];
        const data: { id: number; headline: string; source: string; datetime: number; url: string; summary: string }[] = await res.json();
        return (data || []).slice(0, 3).map((item, i) => ({
          id:       item.id || `${t}-${i}`,
          ticker:   t,
          headline: item.headline,
          source:   item.source,
          url:      item.url || null,
          summary:  item.summary || '',
          time:     new Date(item.datetime * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        }));
      } catch { return []; }
    })
  );

  return NextResponse.json(allNews.flat().slice(0, 30));
}
