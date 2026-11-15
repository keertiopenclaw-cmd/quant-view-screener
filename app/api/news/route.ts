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

const DEFAULT_TICKERS = [
  'NVDA', 'AMD', 'SMCI', 'MSFT', 'GOOGL', 'META', 'AAPL', 'AMZN', 'TSLA',
  'PLTR', 'CRWD', 'NET', 'SNOW', 'IOT', 'HOOD',
];

type Article = {
  id: number | string;
  ticker: string;
  headline: string;
  source: string;
  url: string | null;
  summary: string;
  time: string;
};

type NewsResult = { articles: Article[]; issue: UpstreamIssue | null };

function formatTime(datetime: unknown): string {
  if (typeof datetime !== 'number' || !Number.isFinite(datetime) || datetime <= 0) return '';
  return new Date(datetime * 1000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

async function fetchTickerNews(ticker: string, from: string, to: string, key: string): Promise<NewsResult> {
  const { body, issue } = await fetchFinnhub(
    `/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${from}&to=${to}`,
    key
  );
  if (!Array.isArray(body)) return { articles: [], issue };

  const articles = body.slice(0, 3).map((item, index) => {
    const article = item as {
      id?: number;
      headline?: string;
      source?: string;
      datetime?: number;
      url?: string;
      summary?: string;
    };
    return {
      id: article.id || `${ticker}-${index}`,
      ticker,
      headline: article.headline || 'Untitled headline',
      source: article.source || 'Unknown source',
      url: article.url || null,
      summary: article.summary || '',
      time: formatTime(article.datetime),
    };
  });

  return { articles, issue: null };
}

export async function GET(request: Request) {
  const key = readFinnhubKey();
  if (!key) {
    return NextResponse.json({ error: MISSING_KEY_MESSAGE }, { status: 503 });
  }

  const url = new URL(request.url);
  const requested = sanitizeTickers(url.searchParams.get('ticker')?.split(',') ?? [], 1);
  const tickers = requested.length > 0 ? requested : DEFAULT_TICKERS;
  const cacheKey = `news:${tickers.join(',')}`;
  const cached = readCache<Article[]>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const results = await Promise.all(tickers.map((ticker) => fetchTickerNews(ticker, yesterday, today, key)));

  const articles = results.flatMap((result) => result.articles).slice(0, 30);
  const issues = results.map((result) => result.issue);
  if (articles.length === 0 && issues.some(Boolean)) {
    const issue = dominantIssue(issues);
    return NextResponse.json({ error: failureMessage(issue) }, { status: statusForIssue(issue) });
  }

  if (!issues.some(Boolean)) writeCache(cacheKey, articles);
  return NextResponse.json(articles);
}
