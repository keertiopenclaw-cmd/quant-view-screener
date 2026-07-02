import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GROUPS: Record<string, string[]> = {
  'AI & Semiconductors': ['NVDA', 'AMD', 'SMCI', 'QBTS'],
  'Big Tech':            ['MSFT', 'GOOGL', 'META', 'AAPL', 'AMZN', 'TSLA'],
  'Cybersecurity & Cloud': ['PLTR', 'CRWD', 'NET', 'SNOW', 'IOT'],
  'Fintech & Finance':   ['HOOD', 'UPST', 'MQ', 'UNH'],
  'AI Software':         ['TTD', 'FRSH', 'PATH', 'SOUN', 'VERI', 'BBAI'],
  'Energy & Mining':     ['IREN', 'WULF', 'CLSK', 'APLD', 'UEC', 'CPER'],
  'Healthcare & Biotech':['NVO', 'BAX', 'INOD', 'ABSI'],
  'Other US':            ['LYFT', 'LAES', 'WDC', 'RDW', 'TGLS'],
};

const ALL_TICKERS = Object.values(GROUPS).flat();

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchQuote(ticker: string, key: string) {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${key}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function GET(request: Request) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return NextResponse.json({ error: 'FINNHUB_API_KEY not set' }, { status: 500 });

  // Support extra tickers via query param ?extra=TICKER1,TICKER2
  const url = new URL(request.url);
  const extra = url.searchParams.get('extra')?.split(',').filter(Boolean) ?? [];
  const tickers = [...new Set([...ALL_TICKERS, ...extra])];

  const results = [];

  // Batch in groups of 10 with 200ms delay to avoid rate limit
  for (let i = 0; i < tickers.length; i += 10) {
    const batch = tickers.slice(i, i + 10);
    const batchResults = await Promise.all(
      batch.map(async (ticker) => {
        const quote = await fetchQuote(ticker, key);
        const price  = (quote?.c  && quote.c  > 0) ? parseFloat(quote.c.toFixed(2))  : null;
        const change = (quote?.dp !== undefined)    ? parseFloat(quote.dp.toFixed(2)) : null;
        const group  = Object.entries(GROUPS).find(([, t]) => t.includes(ticker))?.[0] ?? 'Other US';
        return { ticker, group, price, change, pe: null, summary: '' };
      })
    );
    results.push(...batchResults);
    if (i + 10 < tickers.length) await sleep(250);
  }

  return NextResponse.json(results);
}
