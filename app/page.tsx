'use client';

import React, { useEffect, useState, useCallback } from 'react';

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

type Tab = 'watchlist' | 'news';

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

const DEFAULT_HIDDEN: string[] = [];

export default function StockDashboard() {
  const [stocks, setStocks]     = useState<Stock[]>([]);
  const [news, setNews]         = useState<NewsItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>('watchlist');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [search, setSearch]     = useState('');
  const [hidden, setHidden]     = useState<string[]>(DEFAULT_HIDDEN);
  const [addInput, setAddInput] = useState('');
  const [extraTickers, setExtraTickers] = useState<string[]>([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [newsFilter, setNewsFilter] = useState<string>('');

  const fetchData = useCallback(async () => {
    try {
      const extraParam = extraTickers.length ? `?extra=${extraTickers.join(',')}` : '';
      const [stocksRes, newsRes] = await Promise.all([
        fetch(`/api/stocks${extraParam}`),
        fetch('/api/news'),
      ]);
      const stocksData = await stocksRes.json();
      const newsData   = await newsRes.json();
      if (Array.isArray(stocksData)) setStocks(stocksData);
      if (Array.isArray(newsData))   setNews(newsData);
      setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  }, [extraTickers]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s to respect rate limits
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAdd = () => {
    const t = addInput.trim().toUpperCase();
    if (t && !extraTickers.includes(t) && !stocks.find(s => s.ticker === t)) {
      setExtraTickers(prev => [...prev, t]);
    }
    setAddInput('');
    setShowAdd(false);
  };

  const handleRemove = (ticker: string) => {
    setHidden(prev => [...prev, ticker]);
    setExtraTickers(prev => prev.filter(t => t !== ticker));
  };

  const handleRestore = (ticker: string) => {
    setHidden(prev => prev.filter(t => t !== ticker));
  };

  const visibleStocks = stocks
    .filter(s => !hidden.includes(s.ticker))
    .filter(s => search === '' || s.ticker.toLowerCase().includes(search.toLowerCase()));

  const filteredNews = newsFilter
    ? news.filter(n => n.ticker === newsFilter)
    : news;

  const grouped = groupBy(visibleStocks, 'group');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
          <p className="mt-4 text-sm font-medium text-neutral-500">Loading live markets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-neutral-900">
      <div className="mx-auto min-h-screen max-w-md bg-white shadow-sm md:max-w-2xl md:rounded-3xl md:my-6 md:min-h-[90vh] md:border md:border-neutral-200">

        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-neutral-100">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <button
              onClick={() => setShowAdd(v => !v)}
              className="text-2xl leading-none text-neutral-500 hover:text-neutral-900"
              title="Add ticker"
            >+</button>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">Clouds</h1>
              <p className="mt-0.5 text-[10px] text-neutral-400">Updated {lastUpdated || '—'}</p>
            </div>
            <button
              onClick={fetchData}
              className="text-xs font-semibold text-neutral-400 hover:text-neutral-900 border border-neutral-200 rounded-full px-3 py-1"
            >↻ Refresh</button>
          </div>

          {/* Add ticker input */}
          {showAdd && (
            <div className="px-5 pb-2 flex gap-2">
              <input
                className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                placeholder="Enter ticker e.g. COIN"
                value={addInput}
                onChange={e => setAddInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              <button
                onClick={handleAdd}
                className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold"
              >Add</button>
            </div>
          )}

          {/* Search */}
          {tab === 'watchlist' && (
            <div className="px-5 pb-3">
              <input
                className="w-full rounded-2xl bg-neutral-100 px-4 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:bg-neutral-50 focus:ring-1 focus:ring-neutral-300"
                placeholder="🔍  Search tickers..."
                value={search}
                onChange={e => setSearch(e.target.value.toUpperCase())}
              />
            </div>
          )}

          {/* Tabs */}
          <div className="px-5 pb-3">
            <div className="inline-flex rounded-2xl bg-neutral-100 p-1">
              {(['watchlist', 'news'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold capitalize transition ${
                    tab === t ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
                  }`}
                >
                  {t === 'watchlist' ? 'Watchlist' : 'News'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="pb-28">
          {tab === 'watchlist' ? (
            <section className="px-4 pt-3 space-y-6">
              {/* Removed tickers restore bar */}
              {hidden.length > 0 && (
                <div className="rounded-2xl bg-neutral-50 border border-neutral-100 p-3">
                  <p className="text-xs text-neutral-400 mb-2 font-semibold uppercase tracking-wide">Hidden tickers</p>
                  <div className="flex flex-wrap gap-2">
                    {hidden.map(t => (
                      <button
                        key={t}
                        onClick={() => handleRestore(t)}
                        className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-bold text-neutral-600 hover:bg-neutral-900 hover:text-white transition"
                      >{t} ↩</button>
                    ))}
                  </div>
                </div>
              )}

              {Object.entries(grouped).map(([group, groupStocks]) => (
                <div key={group}>
                  <p className="px-1 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                    {group}
                  </p>
                  <div className="divide-y divide-neutral-100">
                    {groupStocks.map((stock) => (
                      <div
                        key={stock.ticker}
                        className="flex items-center justify-between gap-3 rounded-2xl px-2 py-3.5 transition hover:bg-neutral-50 active:bg-neutral-100 group"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                            {stock.ticker.slice(0, 4)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-semibold tracking-tight text-neutral-900">{stock.ticker}</p>
                            <button
                              onClick={() => { setNewsFilter(stock.ticker); setTab('news'); }}
                              className="text-xs text-blue-500 hover:underline"
                            >View news →</button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 text-right">
                            <p className="text-base font-semibold text-neutral-900">
                              {stock.price !== null ? `$${stock.price.toFixed(2)}` : '—'}
                            </p>
                            <p className={`text-sm font-medium ${
                              stock.change === null ? 'text-neutral-400' :
                              stock.change >= 0 ? 'text-emerald-600' : 'text-red-500'
                            }`}>
                              {stock.change !== null ? `${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}%` : '—'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemove(stock.ticker)}
                            className="opacity-0 group-hover:opacity-100 transition text-neutral-300 hover:text-red-400 text-lg leading-none"
                            title="Remove"
                          >✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {visibleStocks.length === 0 && (
                <p className="text-center text-sm text-neutral-400 py-10">No tickers match your search.</p>
              )}
            </section>
          ) : (
            <section className="px-4 pt-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Latest News</p>
                {newsFilter && (
                  <button
                    onClick={() => setNewsFilter('')}
                    className="text-xs text-blue-500 hover:underline"
                  >Show all ✕</button>
                )}
              </div>

              {/* News ticker filter chips */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                {['', ...Array.from(new Set(news.map(n => n.ticker)))].map(t => (
                  <button
                    key={t || 'all'}
                    onClick={() => setNewsFilter(t)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold border transition ${
                      newsFilter === t
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-600 border-neutral-200'
                    }`}
                  >{t || 'All'}</button>
                ))}
              </div>

              {filteredNews.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-10">No news available right now.</p>
              ) : (
                <div className="space-y-3">
                  {filteredNews.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-white border border-neutral-200 px-3 py-1 text-xs font-bold text-neutral-700 shadow-sm">
                          {item.ticker}
                        </span>
                        <span className="text-xs text-neutral-400">{item.time}</span>
                      </div>
                      <h2 className="text-sm font-semibold leading-6 text-neutral-900">{item.headline}</h2>
                      {item.summary && (
                        <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{item.summary}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-neutral-400">{item.source}</p>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-blue-500 hover:underline"
                          >Read more →</a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur safe-area-inset-bottom">
          <div className="mx-auto grid max-w-md grid-cols-4 px-3 py-3">
            <button onClick={() => setTab('watchlist')} className={`flex flex-col items-center gap-1 transition ${tab === 'watchlist' ? 'text-neutral-900' : 'text-neutral-400'}`}>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={tab === 'watchlist' ? 2.5 : 1.8} d="M4 6h16M4 12h16M4 18h16" /></svg>
              <span className="text-xs font-medium">Watchlist</span>
            </button>
            <button onClick={() => { setTab('news'); setNewsFilter(''); }} className={`flex flex-col items-center gap-1 transition ${tab === 'news' ? 'text-neutral-900' : 'text-neutral-400'}`}>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={tab === 'news' ? 2.5 : 1.8} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6m-6 4h6" /></svg>
              <span className="text-xs font-medium">News</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-neutral-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span className="text-xs font-medium">Explore</span>
            </button>
            <button onClick={() => setShowAdd(v => !v)} className="flex flex-col items-center gap-1 text-neutral-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" /></svg>
              <span className="text-xs font-medium">Add</span>
            </button>
          </div>
        </nav>

      </div>
    </div>
  );
}
