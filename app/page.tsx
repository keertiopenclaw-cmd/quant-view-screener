'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_EXTRA_TICKERS, sanitizeTickers, TICKER_PATTERN } from '@/lib/tickers';

type Stock = {
  ticker: string;
  group: string;
  price: number | null;
  change: number | null;
  pe: number | null;
  summary: string;
};

type NewsItem = {
  id: number | string;
  ticker: string;
  headline: string;
  source: string;
  url: string | null;
  summary: string;
  time: string;
};

type Tab = 'watchlist' | 'news' | 'explore' | 'portfolio';

const TABS: { id: Tab; label: string }[] = [
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'news', label: 'News' },
  { id: 'explore', label: 'Explore' },
];

const LS_HIDDEN = 'clouds_hidden';
const LS_EXTRA = 'clouds_extra';
const LS_PORTFOLIO = 'clouds_portfolio';

const EXPLORE_SUGGESTIONS = [
  'COIN', 'RBLX', 'UBER', 'ABNB', 'SPOT', 'ROKU', 'SQ', 'PYPL', 'SHOP', 'DDOG',
  'ZS', 'OKTA', 'MDB', 'BILL', 'GTLB', 'ARM', 'SMCI', 'QBTS', 'RDW', 'IONQ',
  'TSM', 'ASML', 'INTC', 'QCOM', 'AVGO', 'MRVL', 'ON', 'TXN', 'ADI', 'KLAC',
];

const BULLISH = ['surge', 'soar', 'rally', 'beat', 'beats', 'record', 'upgrade', 'profit', 'growth', 'jump', 'outperform', 'gain', 'gains', 'rise', 'rises', 'rose', 'strong', 'bullish'];
const BEARISH = ['plunge', 'miss', 'downgrade', 'warn', 'decline', 'lawsuit', 'probe', 'slump', 'tumble', 'crash', 'drop', 'drops', 'dropped', 'fall', 'falls', 'fell', 'loss', 'losses', 'cut', 'cuts', 'weak', 'selloff', 'slide', 'slides', 'bearish'];

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const group = String(item[key]);
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function mentions(headline: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`, 'i').test(headline);
}

function getSentiment(headline: string): { label: string; color: string } {
  const bullish = BULLISH.filter((word) => mentions(headline, word)).length;
  const bearish = BEARISH.filter((word) => mentions(headline, word)).length;
  if (bullish > bearish) return { label: 'Bullish', color: 'text-emerald-800 bg-emerald-50 border-emerald-200' };
  if (bearish > bullish) return { label: 'Bearish', color: 'text-red-800 bg-red-50 border-red-200' };
  return { label: 'Neutral', color: 'text-neutral-700 bg-neutral-50 border-neutral-200' };
}

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be full or blocked. The screen still works for this visit. */
  }
}

function formatPrice(price: number | null): string {
  if (price === null) return '—';
  return price.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatPercent(change: number | null): string {
  if (change === null) return '—';
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function changeClass(change: number | null): string {
  if (change === null || change === 0) return 'text-neutral-600';
  return change > 0 ? 'text-emerald-700' : 'text-red-700';
}

function safeHref(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
  } catch {
    return null;
  }
  return null;
}

async function readError(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' && data.error.length < 300) {
      return data.error;
    }
  } catch {
    /* A platform timeout can return HTML. Fall through to a plain message. */
  }
  if (response.status === 504 || response.status === 503) return 'Market data took too long to respond.';
  return 'Market data could not be loaded.';
}

function TickerAvatar({ ticker }: { ticker: string }) {
  return (
    <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
      {ticker.slice(0, 4)}
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-2.2-5.8M21 4v6h-6" />
    </svg>
  );
}

export default function StockDashboard() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('watchlist');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [stocksError, setStocksError] = useState<string | null>(null);
  const [stocksWarning, setStocksWarning] = useState<string | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [exploreSearch, setExploreSearch] = useState('');
  const [hidden, setHidden] = useState<string[]>([]);
  const [addInput, setAddInput] = useState('');
  const [addMessage, setAddMessage] = useState('');
  const [extraTickers, setExtraTickers] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newsFilter, setNewsFilter] = useState('');
  const [portfolio, setPortfolio] = useState<Record<string, number>>({});
  const [editPortfolio, setEditPortfolio] = useState<Record<string, string>>({});
  const [editingPortfolio, setEditingPortfolio] = useState(false);
  const inFlight = useRef(false);
  const queued = useRef(false);

  useEffect(() => {
    setHidden(sanitizeTickers(lsGet<string[]>(LS_HIDDEN, []), 100));
    setExtraTickers(sanitizeTickers(lsGet<string[]>(LS_EXTRA, [])));
    setPortfolio(lsGet<Record<string, number>>(LS_PORTFOLIO, {}));
  }, []);

  const fetchData = useCallback(async () => {
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    inFlight.current = true;
    setRefreshing(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    const requestedExtra = new Set(sanitizeTickers(lsGet<string[]>(LS_EXTRA, [])));

    try {
      const extraParam = requestedExtra.size
        ? `?extra=${Array.from(requestedExtra).map(encodeURIComponent).join(',')}`
        : '';
      const [stocksResult, newsResult] = await Promise.all([
        fetch(`/api/stocks${extraParam}`, { cache: 'no-store', signal: controller.signal }),
        fetch('/api/news', { cache: 'no-store', signal: controller.signal }),
      ]);

      if (stocksResult.ok) {
        const stocksData: unknown = await stocksResult.json();
        if (Array.isArray(stocksData)) {
          const savedExtra = new Set(sanitizeTickers(lsGet<string[]>(LS_EXTRA, [])));
          setStocks(
            (stocksData as Stock[]).filter(
              (stock) => !requestedExtra.has(stock.ticker) || savedExtra.has(stock.ticker)
            )
          );
          setStocksError(null);
          setStocksWarning(stocksResult.headers.get('x-market-warning'));
          setUpdatedAt(new Date().toISOString());
        } else {
          setStocksError('Market data came back in an unexpected format.');
        }
      } else {
        setStocksError(await readError(stocksResult));
        setStocksWarning(null);
      }

      if (newsResult.ok) {
        const newsData: unknown = await newsResult.json();
        if (Array.isArray(newsData)) {
          setNews(newsData as NewsItem[]);
          setNewsError(null);
        } else {
          setNewsError('News came back in an unexpected format.');
        }
      } else {
        setNewsError(await readError(newsResult));
      }
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError';
      const message = aborted
        ? 'Market data took too long to respond. Try again.'
        : 'Could not reach the market data service.';
      setStocksError(message);
      setNewsError(message);
    } finally {
      window.clearTimeout(timeout);
      inFlight.current = false;
      setRefreshing(false);
      setLoading(false);
      if (queued.current) {
        queued.current = false;
        void fetchData();
      }
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = window.setInterval(() => void fetchData(), 30_000);
    return () => window.clearInterval(interval);
  }, [fetchData]);

  const handleAdd = () => {
    const ticker = addInput.trim().toUpperCase();
    if (!TICKER_PATTERN.test(ticker)) {
      setAddMessage('Enter a ticker such as COIN or BRK.B.');
      return;
    }
    if (hidden.includes(ticker)) {
      const nextHidden = hidden.filter((item) => item !== ticker);
      setHidden(nextHidden);
      lsSet(LS_HIDDEN, nextHidden);
      setAddInput('');
      setAddMessage('');
      setShowAdd(false);
      return;
    }
    if (extraTickers.includes(ticker) || stocks.some((stock) => stock.ticker === ticker)) {
      setAddMessage(`${ticker} is already on the watchlist.`);
      return;
    }
    if (!extraTickers.includes(ticker) && extraTickers.length >= MAX_EXTRA_TICKERS) {
      setAddMessage(`You can add up to ${MAX_EXTRA_TICKERS} custom tickers.`);
      return;
    }

    const nextHidden = hidden.filter((item) => item !== ticker);
    const nextExtra = extraTickers.includes(ticker) ? extraTickers : [...extraTickers, ticker];
    setHidden(nextHidden);
    setExtraTickers(nextExtra);
    lsSet(LS_HIDDEN, nextHidden);
    lsSet(LS_EXTRA, nextExtra);
    setAddInput('');
    setAddMessage('');
    setShowAdd(false);
    void fetchData();
  };

  const handleRemove = (ticker: string) => {
    if (extraTickers.includes(ticker)) {
      const nextExtra = extraTickers.filter((item) => item !== ticker);
      const nextHidden = hidden.filter((item) => item !== ticker);
      setExtraTickers(nextExtra);
      setHidden(nextHidden);
      setStocks((current) => current.filter((stock) => stock.ticker !== ticker));
      lsSet(LS_EXTRA, nextExtra);
      lsSet(LS_HIDDEN, nextHidden);
      return;
    }
    const nextHidden = hidden.includes(ticker) ? hidden : [...hidden, ticker];
    setHidden(nextHidden);
    lsSet(LS_HIDDEN, nextHidden);
  };

  const handleRestore = (ticker: string) => {
    const nextHidden = hidden.filter((item) => item !== ticker);
    setHidden(nextHidden);
    lsSet(LS_HIDDEN, nextHidden);
  };

  const savePortfolio = () => {
    const parsed: Record<string, number> = {};
    Object.entries(editPortfolio).forEach(([ticker, value]) => {
      const shares = parseFloat(value);
      if (!Number.isNaN(shares) && shares > 0) parsed[ticker] = shares;
    });
    setPortfolio(parsed);
    lsSet(LS_PORTFOLIO, parsed);
    setEditingPortfolio(false);
  };

  const startEditPortfolio = () => {
    const draft: Record<string, string> = {};
    stocks.filter((stock) => !hidden.includes(stock.ticker)).forEach((stock) => {
      draft[stock.ticker] = portfolio[stock.ticker]?.toString() || '';
    });
    setEditPortfolio(draft);
    setEditingPortfolio(true);
  };

  const portfolioValue = stocks.reduce((sum, stock) => {
    if (stock.price && portfolio[stock.ticker]) return sum + stock.price * portfolio[stock.ticker];
    return sum;
  }, 0);

  const portfolioDayChange = stocks.reduce((sum, stock) => {
    if (stock.price && stock.change && portfolio[stock.ticker]) {
      const previous = stock.price / (1 + stock.change / 100);
      return sum + (stock.price - previous) * portfolio[stock.ticker];
    }
    return sum;
  }, 0);

  const hasPortfolio = Object.values(portfolio).some((shares) => shares > 0);
  const visibleStocks = stocks
    .filter((stock) => !hidden.includes(stock.ticker))
    .filter((stock) => search === '' || stock.ticker.toLowerCase().includes(search.toLowerCase()));
  const filteredNews = newsFilter ? news.filter((item) => item.ticker === newsFilter) : news;
  const grouped = groupBy(visibleStocks, 'group');
  const exploreFiltered = EXPLORE_SUGGESTIONS.filter(
    (ticker) => !stocks.some((stock) => stock.ticker === ticker) && (exploreSearch === '' || ticker.includes(exploreSearch.toUpperCase()))
  );
  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;
  const showInitialSpinner = loading && stocks.length === 0 && !stocksError;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-neutral-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="mx-auto min-h-screen max-w-md bg-white md:my-6 md:min-h-[calc(100vh-3rem)] md:max-w-3xl md:rounded-3xl md:border md:border-neutral-200 md:shadow-sm lg:max-w-5xl">
        <header className="sticky top-0 z-20 border-b border-neutral-100 bg-white/95 backdrop-blur md:rounded-t-3xl">
          <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
            <button
              type="button"
              onClick={() => {
                setShowAdd((open) => !open);
                setAddMessage('');
              }}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-2xl leading-none text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
              aria-expanded={showAdd}
              aria-controls="add-ticker-panel"
            >
              <span aria-hidden="true">+</span>
              <span className="sr-only">{showAdd ? 'Close add ticker' : 'Add a ticker'}</span>
            </button>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">Quant View</h1>
              <p className="text-xs text-neutral-600">Markets dashboard</p>
              <p className="mt-0.5 text-xs text-neutral-600">
                {refreshing && !showInitialSpinner ? 'Updating… ' : null}
                {updatedLabel ? (
                  <>
                    Updated <time dateTime={updatedAt ?? undefined}>{updatedLabel}</time>
                  </>
                ) : (
                  'Waiting for prices'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchData()}
              disabled={refreshing}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-sm font-semibold text-neutral-700 hover:text-neutral-900 disabled:opacity-60"
            >
              <RefreshIcon />
              Refresh
            </button>
          </div>

          {stocksError ? (
            <div role="alert" className="mx-5 mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <p>{stocksError}</p>
              <button type="button" onClick={() => void fetchData()} className="mt-1 font-semibold underline">
                Retry
              </button>
            </div>
          ) : null}
          {!stocksError && stocksWarning ? (
            <p className="mx-5 mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">{stocksWarning}</p>
          ) : null}

          {showAdd ? (
            <form
              id="add-ticker-panel"
              className="flex flex-col gap-2 px-5 pb-3"
              onSubmit={(event) => {
                event.preventDefault();
                handleAdd();
              }}
            >
              <div className="flex gap-2">
                <label htmlFor="add-ticker" className="sr-only">
                  Ticker symbol
                </label>
                <input
                  id="add-ticker"
                  className="min-h-11 flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none"
                  placeholder="Ticker, such as COIN"
                  value={addInput}
                  onChange={(event) => setAddInput(event.target.value.toUpperCase())}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setShowAdd(false);
                  }}
                  autoComplete="off"
                  autoCapitalize="characters"
                  autoFocus
                />
                <button type="submit" className="min-h-11 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
                  Add
                </button>
              </div>
              {addMessage ? <p className="text-sm text-amber-900">{addMessage}</p> : null}
            </form>
          ) : null}

          {tab === 'watchlist' ? (
            <div className="px-5 pb-3">
              <label htmlFor="watchlist-search" className="sr-only">
                Search tickers
              </label>
              <input
                id="watchlist-search"
                type="search"
                className="min-h-11 w-full rounded-2xl bg-neutral-100 px-4 py-2.5 text-sm outline-none placeholder:text-neutral-600"
                placeholder="Search tickers"
                value={search}
                onChange={(event) => setSearch(event.target.value.toUpperCase())}
              />
            </div>
          ) : null}

          <div className="hidden px-5 pb-3 md:block">
            <div role="tablist" aria-label="Sections" className="inline-flex gap-0.5 rounded-2xl bg-neutral-100 p-1">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`tab-${item.id}`}
                  aria-selected={tab === item.id}
                  aria-controls={`panel-${item.id}`}
                  onClick={() => {
                    setTab(item.id);
                    if (item.id === 'news') setNewsFilter('');
                  }}
                  className={`min-h-11 rounded-2xl px-4 py-2 text-sm font-semibold ${
                    tab === item.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main id="main" className="pb-28 md:pb-10">
          {showInitialSpinner ? (
            <div role="status" className="flex flex-col items-center px-6 py-24 text-center">
              <div
                aria-hidden="true"
                className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900 motion-reduce:animate-none"
              />
              <p className="mt-4 text-sm font-medium text-neutral-700">Loading live markets…</p>
            </div>
          ) : null}

          {tab === 'watchlist' && !showInitialSpinner ? (
            <section id="panel-watchlist" role="tabpanel" aria-labelledby="tab-watchlist" className="space-y-6 px-4 pt-3 lg:px-6">
              {hidden.length > 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-600">Hidden tickers</h2>
                  <div className="flex flex-wrap gap-2">
                    {hidden.map((ticker) => (
                      <button
                        key={ticker}
                        type="button"
                        onClick={() => handleRestore(ticker)}
                        className="min-h-11 rounded-full border border-neutral-300 bg-white px-3 py-1 text-sm font-bold text-neutral-800 hover:bg-neutral-900 hover:text-white"
                      >
                        Restore {ticker}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {stocks.length === 0 && stocksError ? (
                <p className="py-10 text-center text-sm text-neutral-700">Prices will show here after the connection is restored.</p>
              ) : null}

              <div className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-x-10 lg:gap-y-8 lg:space-y-0">
                {Object.entries(grouped).map(([group, groupStocks]) => (
                  <div key={group}>
                    <h2 className="px-1 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">{group}</h2>
                    <ul className="divide-y divide-neutral-100">
                      {groupStocks.map((stock) => (
                        <li key={stock.ticker} className="flex items-center justify-between gap-3 rounded-2xl px-2 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <TickerAvatar ticker={stock.ticker} />
                            <div className="min-w-0">
                              <p className="text-base font-semibold tracking-tight">{stock.ticker}</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewsFilter(stock.ticker);
                                  setTab('news');
                                }}
                                className="text-sm font-medium text-blue-800 underline-offset-2 hover:underline"
                              >
                                View {stock.ticker} news
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="shrink-0 text-right">
                              <p className="text-base font-semibold">{formatPrice(stock.price)}</p>
                              <p className={`text-sm font-medium ${changeClass(stock.change)}`}>{formatPercent(stock.change)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemove(stock.ticker)}
                              className="min-h-11 rounded-full px-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-red-700"
                            >
                              {extraTickers.includes(stock.ticker) ? 'Remove' : 'Hide'}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {visibleStocks.length === 0 && stocks.length > 0 ? (
                <p className="py-10 text-center text-sm text-neutral-700">
                  {search ? `No tickers match “${search}”.` : 'Every ticker is hidden. Restore one above.'}
                </p>
              ) : null}
            </section>
          ) : null}

          {tab === 'portfolio' && !showInitialSpinner ? (
            <section id="panel-portfolio" role="tabpanel" aria-labelledby="tab-portfolio" className="space-y-4 px-4 pt-4 lg:px-6">
              <div className="rounded-2xl bg-slate-900 p-5 text-white">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-300">Portfolio value</h2>
                <p className="mt-1 text-3xl font-bold">{formatMoney(portfolioValue)}</p>
                {hasPortfolio ? (
                  <p className={`mt-1 text-sm font-semibold ${portfolioDayChange >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {portfolioDayChange >= 0 ? '+' : ''}
                    {formatMoney(portfolioDayChange)} today
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-300">Add share quantities to estimate a value. Nothing is sent to a server.</p>
                )}
              </div>

              <div className="flex justify-end">
                {editingPortfolio ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingPortfolio(false)}
                      className="min-h-11 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700"
                    >
                      Cancel
                    </button>
                    <button type="button" onClick={savePortfolio} className="min-h-11 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startEditPortfolio}
                    className="min-h-11 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
                  >
                    Edit holdings
                  </button>
                )}
              </div>

              {stocks.length === 0 ? (
                <p className="py-6 text-center text-sm text-neutral-700">Holdings need live prices before a value can be estimated.</p>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {stocks
                    .filter((stock) => !hidden.includes(stock.ticker))
                    .map((stock) => {
                      const shares = portfolio[stock.ticker] || 0;
                      const value = stock.price ? stock.price * shares : 0;
                      const dayPnl =
                        stock.price && stock.change && shares
                          ? (stock.price - stock.price / (1 + stock.change / 100)) * shares
                          : 0;
                      return (
                        <li key={stock.ticker} className="flex items-center justify-between gap-3 py-3.5">
                          <div className="flex items-center gap-3">
                            <TickerAvatar ticker={stock.ticker} />
                            <div>
                              <p className="text-sm font-semibold">{stock.ticker}</p>
                              {editingPortfolio ? (
                                <div className="mt-1">
                                  <label htmlFor={`shares-${stock.ticker}`} className="sr-only">
                                    Shares of {stock.ticker}
                                  </label>
                                  <input
                                    id={`shares-${stock.ticker}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    inputMode="decimal"
                                    value={editPortfolio[stock.ticker] || ''}
                                    onChange={(event) => setEditPortfolio((prev) => ({ ...prev, [stock.ticker]: event.target.value }))}
                                    placeholder="0"
                                    className="w-28 rounded-lg border border-neutral-300 px-2 py-1 text-sm outline-none"
                                  />
                                </div>
                              ) : (
                                <p className="text-sm text-neutral-600">{shares > 0 ? `${shares} shares` : 'Not tracked'}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{shares > 0 ? formatMoney(value) : '—'}</p>
                            {dayPnl !== 0 ? (
                              <p className={`text-sm font-medium ${dayPnl > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                {dayPnl > 0 ? '+' : ''}
                                {formatMoney(dayPnl)}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </section>
          ) : null}

          {tab === 'news' && !showInitialSpinner ? (
            <section id="panel-news" role="tabpanel" aria-labelledby="tab-news" className="px-4 pt-3 lg:px-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">Latest news</h2>
                {newsFilter ? (
                  <button type="button" onClick={() => setNewsFilter('')} className="min-h-11 text-sm font-semibold text-blue-800 underline">
                    Show all news
                  </button>
                ) : null}
              </div>
              <p className="mb-3 text-sm text-neutral-600">
                Recent headlines for the main names on the watchlist.
              </p>
              {newsError ? (
                <p role="alert" className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  {newsError}
                </p>
              ) : null}
              <div className="mb-3 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filter news by ticker">
                {['', ...Array.from(new Set(news.map((item) => item.ticker)))].map((ticker) => (
                  <button
                    key={ticker || 'all'}
                    type="button"
                    onClick={() => setNewsFilter(ticker)}
                    aria-pressed={newsFilter === ticker}
                    className={`min-h-11 shrink-0 rounded-full border px-3 py-1 text-sm font-bold ${
                      newsFilter === ticker ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white text-neutral-800'
                    }`}
                  >
                    {ticker || 'All'}
                  </button>
                ))}
              </div>
              {filteredNews.length === 0 ? (
                <p className="py-10 text-center text-sm text-neutral-700">
                  {newsError
                    ? 'Headlines will show here after the connection is restored.'
                    : newsFilter
                      ? `No recent headlines for ${newsFilter}.`
                      : 'No recent headlines for this sample of the watchlist.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredNews.map((item) => {
                    const sentiment = getSentiment(item.headline);
                    const href = safeHref(item.url);
                    return (
                      <article key={item.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-bold text-neutral-800">
                            {item.ticker}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${sentiment.color}`}>{sentiment.label}</span>
                          {item.time ? <span className="ml-auto text-xs text-neutral-600">{item.time}</span> : null}
                        </div>
                        <h3 className="text-sm font-semibold leading-6 text-neutral-900">{item.headline}</h3>
                        {item.summary ? <p className="mt-1 line-clamp-2 text-sm text-neutral-700">{item.summary}</p> : null}
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="text-xs text-neutral-600">{item.source}</p>
                          {href ? (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-800 underline">
                              Read {item.ticker} article
                            </a>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          ) : null}

          {tab === 'explore' && !showInitialSpinner ? (
            <section id="panel-explore" role="tabpanel" aria-labelledby="tab-explore" className="space-y-4 px-4 pt-4 lg:px-6">
              <label htmlFor="explore-search" className="sr-only">
                Search suggested stocks
              </label>
              <input
                id="explore-search"
                type="search"
                className="min-h-11 w-full rounded-2xl bg-neutral-100 px-4 py-2.5 text-sm outline-none placeholder:text-neutral-600"
                placeholder="Search stocks to add"
                value={exploreSearch}
                onChange={(event) => setExploreSearch(event.target.value)}
              />
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">Suggested stocks</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {exploreFiltered.map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    onClick={() => {
                      if (extraTickers.length >= MAX_EXTRA_TICKERS) {
                        setTab('watchlist');
                        setShowAdd(true);
                        setAddMessage(`You can add up to ${MAX_EXTRA_TICKERS} custom tickers.`);
                        return;
                      }
                      const nextExtra = [...extraTickers, ticker];
                      setExtraTickers(nextExtra);
                      lsSet(LS_EXTRA, nextExtra);
                      void fetchData();
                    }}
                    className="rounded-2xl border border-neutral-300 bg-white p-4 text-left hover:border-neutral-400 hover:bg-neutral-50"
                  >
                    <TickerAvatar ticker={ticker} />
                    <p className="mt-2 text-sm font-bold">{ticker}</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-800">Add to watchlist</p>
                  </button>
                ))}
              </div>
              {exploreFiltered.length === 0 ? (
                <p className="py-10 text-center text-sm text-neutral-700">Every suggestion is already on the watchlist.</p>
              ) : null}
            </section>
          ) : null}

          <p className="px-5 pb-4 pt-8 text-center text-xs leading-5 text-neutral-600">
            Prices and headlines come from Finnhub and can be delayed. This is not investment advice. Holdings stay in this browser only.
          </p>
        </main>

        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur md:hidden"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto grid max-w-md grid-cols-4 px-2 pt-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  if (item.id === 'news') setNewsFilter('');
                }}
                aria-current={tab === item.id ? 'page' : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-1 text-xs font-medium ${
                  tab === item.id ? 'text-neutral-900' : 'text-neutral-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
