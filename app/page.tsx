'use client';

import React, { useEffect, useState } from 'react';

type Stock = {
  ticker: string;
  price: number;
  change: number;
  pe: number | string;
  summary: string;
};

type NewsItem = {
  id: number;
  ticker: string;
  headline: string;
  source: string;
  time: string;
};

type Tab = 'watchlist' | 'news';

export default function StockDashboard() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('watchlist');

  const fetchData = async () => {
    try {
      const [stocksRes, newsRes] = await Promise.all([
        fetch('/api/stocks'),
        fetch('/api/news'),
      ]);
      const stocksData = await stocksRes.json();
      const newsData = await newsRes.json();
      setStocks(stocksData);
      setNews(newsData);
    } catch (err) {
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-neutral-300 border-t-neutral-900" />
          <p className="mt-4 text-sm font-medium text-neutral-500">Loading markets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-neutral-900">
      <div className="mx-auto min-h-screen max-w-md bg-white shadow-sm md:max-w-2xl md:rounded-3xl md:my-6 md:min-h-[90vh] md:border md:border-neutral-200">

        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-neutral-100">
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <button className="text-3xl leading-none text-neutral-700">&#8943;</button>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">Clouds</h1>
              <p className="mt-1 text-xs text-neutral-500">My watch list</p>
            </div>
            <button className="text-4xl leading-none font-light text-neutral-700">+</button>
          </div>

          {/* Tabs */}
          <div className="px-5 pb-4">
            <div className="inline-flex rounded-2xl bg-neutral-100 p-1">
              <button
                onClick={() => setTab('watchlist')}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  tab === 'watchlist'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500'
                }`}
              >
                Watchlist
              </button>
              <button
                onClick={() => setTab('news')}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  tab === 'news'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500'
                }`}
              >
                News
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="pb-28">
          {tab === 'watchlist' ? (
            <section className="px-4 pt-3">
              <p className="px-1 pb-3 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                Stocks
              </p>
              <div className="divide-y divide-neutral-100">
                {stocks.map((stock) => (
                  <div
                    key={stock.ticker}
                    className="flex items-center justify-between gap-3 rounded-2xl px-2 py-4 transition hover:bg-neutral-50 active:bg-neutral-100"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                        {stock.ticker.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold tracking-tight text-neutral-900">
                          {stock.ticker}
                        </p>
                        <p className="truncate text-sm text-neutral-500 max-w-[180px]">
                          {stock.summary}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-semibold text-neutral-900">
                        {stock.price.toFixed(2)}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          stock.change >= 0 ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="px-4 pt-3">
              <p className="px-1 pb-3 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                Latest News
              </p>
              <div className="space-y-3">
                {news.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-white border border-neutral-200 px-3 py-1 text-xs font-bold text-neutral-700 shadow-sm">
                        {item.ticker}
                      </span>
                      <span className="text-xs text-neutral-400">{item.time}</span>
                    </div>
                    <h2 className="text-sm font-semibold leading-6 text-neutral-900">
                      {item.headline}
                    </h2>
                    <p className="mt-2 text-xs text-neutral-400">{item.source}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur safe-area-inset-bottom">
          <div className="mx-auto grid max-w-md grid-cols-4 px-3 py-3">
            <button
              onClick={() => setTab('watchlist')}
              className={`flex flex-col items-center gap-1 transition ${
                tab === 'watchlist' ? 'text-neutral-900' : 'text-neutral-400'
              }`}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={tab === 'watchlist' ? 2.5 : 1.8} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-xs font-medium">Watchlist</span>
            </button>

            <button
              onClick={() => setTab('news')}
              className={`flex flex-col items-center gap-1 transition ${
                tab === 'news' ? 'text-neutral-900' : 'text-neutral-400'
              }`}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={tab === 'news' ? 2.5 : 1.8} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6m-6 4h6" />
              </svg>
              <span className="text-xs font-medium">News</span>
            </button>

            <button className="flex flex-col items-center gap-1 text-neutral-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-xs font-medium">Explore</span>
            </button>

            <button className="flex flex-col items-center gap-1 text-neutral-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h10" />
              </svg>
              <span className="text-xs font-medium">Menu</span>
            </button>
          </div>
        </nav>

      </div>
    </div>
  );
}
