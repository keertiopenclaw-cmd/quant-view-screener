import { NextResponse } from 'next/server';
import {
  dominantIssue,
  failureMessage,
  fetchFinnhub,
  MISSING_KEY_MESSAGE,
  readFinnhubKey,
  statusForIssue,
  type UpstreamIssue,
} from '@/lib/finnhub';
import { readCache, writeCache } from '@/lib/response-cache';
import { sanitizeTickers } from '@/lib/tickers';

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Quote = {
  ticker: string;
  group: string;
  price: number | null;
  change: number | null;
  pe: number | null;
  summary: string;
  issue: UpstreamIssue | null;
};

function groupFor(ticker: string): string {
  return Object.entries(GROUPS).find(([, tickers]) => tickers.includes(ticker))?.[0] ?? 'Added';
}

async function fetchQuote(ticker: string, key: string): Promise<Quote> {
  const { body, issue } = await fetchFinnhub(`/api/v1/quote?symbol=${encodeURIComponent(ticker)}`, key);
  const quote = body && typeof body === 'object' ? (body as { c?: number; dp?: number | null }) : {};
  const price = typeof quote.c === 'number' && quote.c > 0 ? parseFloat(quote.c.toFixed(2)) : null;
  const change = typeof quote.dp === 'number' ? parseFloat(quote.dp.toFixed(2)) : null;
  return { ticker, group: groupFor(ticker), price, change, pe: null, summary: '', issue };
}

export async function GET(request: Request) {
  const key = readFinnhubKey();
  if (!key) {
    return NextResponse.json({ error: MISSING_KEY_MESSAGE }, { status: 503 });
  }

  const url = new URL(request.url);
  const extra = sanitizeTickers(url.searchParams.get('extra')?.split(',') ?? []);
  const tickers = [...new Set([...ALL_TICKERS, ...extra])];
  const cacheKey = `stocks:${tickers.join(',')}`;
  const cached = readCache<Omit<Quote, 'issue'>[]>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const results: Quote[] = [];

  // Batches keep a full watchlist refresh from bursting the provider limit.
  for (let i = 0; i < tickers.length; i += 10) {
    const batch = tickers.slice(i, i + 10);
    results.push(...(await Promise.all(batch.map((ticker) => fetchQuote(ticker, key)))));
    if (i + 10 < tickers.length) await sleep(200);
  }

  const priced = results.filter((quote) => quote.price !== null);
  if (priced.length === 0 && results.some((quote) => quote.issue)) {
    const issue = dominantIssue(results.map((quote) => quote.issue));
    return NextResponse.json({ error: failureMessage(issue) }, { status: statusForIssue(issue) });
  }

  const payload = results.map((quote) => ({
    ticker: quote.ticker,
    group: quote.group,
    price: quote.price,
    change: quote.change,
    pe: quote.pe,
    summary: quote.summary,
  }));
  if (priced.length === results.length) writeCache(cacheKey, payload);

  const response = NextResponse.json(payload);
  const missing = results.length - priced.length;
  if (missing > 0) {
    response.headers.set(
      'x-market-warning',
      `Prices are missing for ${missing} ${missing === 1 ? 'ticker' : 'tickers'}.`
    );
  }
  return response;
}
