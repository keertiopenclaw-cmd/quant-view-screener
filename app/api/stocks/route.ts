import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GROUPS: Record<string, string[]> = {
  'AI & Semiconductors': ['NVDA', 'AMD', 'SMCI', 'QBTS'],
  'Big Tech': ['MSFT', 'GOOGL', 'META', 'AAPL', 'AMZN', 'TSLA'],
  'Cybersecurity & Cloud': ['PLTR', 'CRWD', 'NET', 'SNOW', 'IOT'],
  'Fintech & Finance': ['HOOD', 'UPST', 'MQ', 'UNH'],
  'AI Software': ['TTD', 'FRSH', 'PATH', 'SOUN', 'VERI', 'BBAI'],
  'Energy & Mining': ['IREN', 'WULF', 'CLSK', 'APLD', 'UEC', 'CPER'],
  'Healthcare & Biotech': ['NVO', 'BAX', 'INOD', 'ABSI'],
  'Other US': ['LYFT', 'LAES', 'WDC', 'RDW', 'TGLS'],
};

const ALL_TICKERS = Object.values(GROUPS).flat();

async function fetchFinnhub(path: string) {
  const key = process.env.FINNHUB_API_KEY;
  const res = await fetch(`https://finnhub.io/api/v1${path}&token=${key}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export async function GET() {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'FINNHUB_API_KEY not set' }, { status: 500 });
  }

  const results = await Promise.all(
    ALL_TICKERS.map(async (ticker) => {
      const [quote, metrics] = await Promise.all([
        fetchFinnhub(`/quote?symbol=${encodeURIComponent(ticker)}`),
        fetchFinnhub(`/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all`),
      ]);

      const price  = quote?.c   ?? null;
      const change = quote?.dp  ?? null;
      const pe     = metrics?.metric?.peNormalizedAnnual
                  ?? metrics?.metric?.peTTM
                  ?? metrics?.metric?.['peExclExtraTTM']
                  ?? null;

      const group = Object.entries(GROUPS).find(([, tickers]) => tickers.includes(ticker))?.[0] ?? 'Other US';

      return {
        ticker,
        group,
        price:  price  !== null ? parseFloat(price.toFixed(2))  : null,
        change: change !== null ? parseFloat(change.toFixed(2)) : null,
        pe:     pe     !== null ? parseFloat(pe.toFixed(1))     : null,
        summary: '',
      };
    })
  );

  return NextResponse.json(results);
}
