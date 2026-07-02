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

type Tab = 'watchlist' | 'news' | 'explore' | 'portfolio';

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function getSentiment(headline: string): { label: string; color: string } {
  const h = headline.toLowerCase();
  const bullish = ['surge', 'soar', 'rally', 'beat', 'record', 'buy', 'upgrade', 'profit', 'growth', 'gain', 'rise', 'jump', 'strong', 'bull', 'boost', 'positive', 'outperform', 'high'];
  const bearish = ['fall', 'drop', 'plunge', 'miss', 'loss', 'sell', 'downgrade', 'cut', 'warn', 'decline', 'weak', 'bear', 'crash', 'risk', 'concern', 'lower', 'below', 'lawsuit', 'fine', 'probe'];
  const bScore = bullish.filter(w => h.includes(w)).length;
  const rScore = bearish.filter(w => h.includes(w)).length;
  if (bScore > rScore) return { label: '🟢 Bullish', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
  if (rScore > bScore) return { label: '🔴 Bearish', color: 'text-red-500 bg-red-50 border-red-200' };
  return { label: '⚪ Neutral', color: 'text-neutral-500 bg-neutral-50 border-neutral-200' };
}

const LS_HIDDEN = 'clouds_hidden';
const LS_EXTRA = 'clouds_extra';
const LS_PORTFOLIO = 'clouds_portfolio';

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export default function StockDashboard() {
  const [stocks, setStocks]     = useState<Stock[]>([]);
  const [news, setNews]         = useState<NewsItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>('watchlist');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isStale, setIsStale]   = useState(false);
  const [search, setSearch]     = useState('');
  const [exploreSearch, setExploreSearch] = useState('');
  const [hidden, setHidden]     = useState<string[]>([]);
  const [addInput, setAddInput] = useState('');
  const [extraTickers, setExtraTickers] = useState<string[]>([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [newsFilter, setNewsFilter] = useState<string>('');
  // portfolio: { [ticker]: shares }
  const [portfolio, setPortfolio] = useState<Record<string, number>>({});
  const [editPortfolio, setEditPortfolio] = useState<Record<string, string>>({});
  const [editingPortfolio, setEditingPortfolio] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setHidden(lsGet<string[]>(LS_HIDDEN, []));
    setExtraTickers(lsGet<string[]>(LS_EXTRA, []));
    setPortfolio(lsGet<Record<string, number>>(LS_PORTFOLIO, {}));
  }, []);

  const fetchData = useCallback(async () => {
    const staleTimer = setTimeout(() => setIsStale(true), 35000);
    try {
      const extra = lsGet<string[]>(LS_EXTRA, []);
      const extraParam = extra.length ? `?extra=${extra.join(',')}` : '';
      const [stocksRes, newsRes] = await Promise.all([
        fetch(`/api/stocks${extraParam}`),
        fetch('/api/news'),
      ]);
      if (!stocksRes.ok || !newsRes.ok) { setIsStale(true); return; }
      const stocksData = await stocksRes.json();
      const newsData   = await newsRes.json();
      if (Array.isArray(stocksData)) setStocks(stocksData);
      if (Array.isArray(newsData))   setNews(newsData);
      setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsStale(false);
      clearTimeout(staleTimer);
    } catch {
      setIsStale(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAdd = () => {
    const t = addInput.trim().toUpperCase();
    if (t && !extraTickers.includes(t) && !stocks.find(s => s.ticker === t)) {
      const updated = [...extraTickers, t];
      setExtraTickers(updated);
      lsSet(LS_EXTRA, updated);
    }
    setAddInput('');
    setShowAdd(false);
  };

  const handleRemove = (ticker: string) => {
    const newHidden = [...hidden, ticker];
    const newExtra  = extraTickers.filter(t => t !== ticker);
    setHidden(newHidden);
    setExtraTickers(newExtra);
    lsSet(LS_HIDDEN, newHidden);
    lsSet(LS_EXTRA, newExtra);
  };

  const handleRestore = (ticker: string) => {
    const updated = hidden.filter(t => t !== ticker);
    setHidden(updated);
    lsSet(LS_HIDDEN, updated);
  };

  const savePortfolio = () => {
    const parsed: Record<string, number> = {};
    Object.entries(editPortfolio).forEach(([k, v]) => {
      const n = parseFloat(v);
      if (!isNaN(n) && n > 0) parsed[k] = n;
    });
    setPortfolio(parsed);
    lsSet(LS_PORTFOLIO, parsed);
    setEditingPortfolio(false);
  };

  const startEditPortfolio = () => {
    const draft: Record<string, string> = {};
    stocks.filter(s => !hidden.includes(s.ticker)).forEach(s => {
      draft[s.ticker] = portfolio[s.ticker]?.toString() || '';
    });
    setEditPortfolio(draft);
    setEditingPortfolio(true);
  };

  // Portfolio calculations
  const portfolioValue = stocks.reduce((sum, s) => {
    if (s.price && portfolio[s.ticker]) sum += s.price * portfolio[s.ticker];
    return sum;
  }, 0);

  const portfolioDayChange = stocks.reduce((sum, s) => {
    if (s.price && s.change && portfolio[s.ticker]) {
      const prevPrice = s.price / (1 + s.change / 100);
      sum += (s.price - prevPrice) * portfolio[s.ticker];
    }
    return sum;
  }, 0);

  const hasPortfolio = Object.keys(portfolio).length > 0;

  const visibleStocks = stocks
    .filter(s => !hidden.includes(s.ticker))
    .filter(s => search === '' || s.ticker.toLowerCase().includes(search.toLowerCase()));

  const filteredNews = newsFilter
    ? news.filter(n => n.ticker === newsFilter)
    : news;

  const grouped = groupBy(visibleStocks, 'group');

  const EXPLORE_SUGGESTIONS = [
    'COIN','RBLX','UBER','ABNB','SPOT','ROKU','SQ','PYPL','SHOP','DDOG',
    'ZS','OKTA','MDB','BILL','GTLB','ARM','SMCI','QBTS','RDW','IONQ',
    'TSM','ASML','INTC','QCOM','AVGO','MRVL','ON','TXN','ADI','KLAC',
  ];
  const exploreFiltered = EXPLORE_SUGGESTIONS.filter(t =>
    !stocks.find(s => s.ticker === t) &&
    (exploreSearch === '' || t.includes(exploreSearch.toUpperCase()))
  );

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

          {/* Stale data warning */}
          {isStale && (
            <div className="mx-5 mb-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 font-medium flex items-center gap-2">
              ⚠️ Data may be delayed or unavailable. <button onClick={fetchData} className="underline">Retry</button>
            </div>
          )}

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

          {/* Search (watchlist only) */}
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
          <div className="px-5 pb-3 overflow-x-auto">
            <div className="inline-flex rounded-2xl bg-neutral-100 p-1 gap-0.5">
              {(['watchlist', 'portfolio', 'news', 'explore'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-2xl px-3 py-2 text-xs font-semibold capitalize transition whitespace-nowrap ${
                    tab === t ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
                  }`}
                >
                  {t === 'watchlist' ? '📋 Watchlist' : t === 'news' ? '📰 News' : t === 'portfolio' ? '💼 Portfolio' : '🔭 Explore'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="pb-28">

          {/* ── WATCHLIST TAB ── */}
          {tab === 'watchlist' && (
            <section className="px-4 pt-3 space-y-6">
              {hidden.length > 0 && (
                <div className="rounded-2xl bg-neutral-50 border border-neutral-100 p-3">
                  <p className="text-xs text-neutral-400 mb-2 font-semibold uppercase tracking-wide">Hidden tickers</p>
                  <div className="flex flex-wrap gap-2">
                    {hidden.map(t => (
                      <button key={t} onClick={() => handleRestore(t)}
                        className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-bold text-neutral-600 hover:bg-neutral-900 hover:text-white transition"
                      >{t} ↩</button>
                    ))}
                  </div>
                </div>
              )}

              {Object.entries(grouped).map(([group, groupStocks]) => (
                <div key={group}>
                  <p className="px-1 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">{group}</p>
                  <div className="divide-y divide-neutral-100">
                    {groupStocks.map((stock) => (
                      <div key={stock.ticker}
                        className="flex items-center justify-between gap-3 rounded-2xl px-2 py-3.5 transition hover:bg-neutral-50 active:bg-neutral-100 group"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                            {stock.ticker.slice(0, 4)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-semibold tracking-tight text-neutral-900">{stock.ticker}</p>
                            <button onClick={() => { setNewsFilter(stock.ticker); setTab('news'); }}
                              className="text-xs text-blue-500 hover:underline">View news →</button>
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
                          <button onClick={() => handleRemove(stock.ticker)}
                            className="opacity-0 group-hover:opacity-100 transition text-neutral-300 hover:text-red-400 text-lg leading-none"
                            title="Remove">✕</button>
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
          )}

          {/* ── PORTFOLIO TAB ── */}
          {tab === 'portfolio' && (
            <section className="px-4 pt-4 space-y-4">
              {/* Total value card */}
              <div className="rounded-2xl bg-slate-900 text-white p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Portfolio Value</p>
                <p className="mt-1 text-3xl font-bold">${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className={`mt-1 text-sm font-semibold ${ portfolioDayChange >= 0 ? 'text-emerald-400' : 'text-red-400' }`}>
                  {portfolioDayChange >= 0 ? '+' : ''}${portfolioDayChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} today
                </p>
                {!hasPortfolio && <p className="mt-2 text-xs text-slate-400">Tap &quot;Edit Holdings&quot; to enter your share quantities.</p>}
              </div>

              <div className="flex justify-end">
                {editingPortfolio ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingPortfolio(false)}
                      className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-500">Cancel</button>
                    <button onClick={savePortfolio}
                      className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-semibold">Save</button>
                  </div>
                ) : (
                  <button onClick={startEditPortfolio}
                    className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50">✏️ Edit Holdings</button>
                )}
              </div>

              <div className="divide-y divide-neutral-100">
                {stocks.filter(s => !hidden.includes(s.ticker)).map(stock => {
                  const shares = portfolio[stock.ticker] || 0;
                  const value  = stock.price ? stock.price * shares : 0;
                  const dayPnl = (stock.price && stock.change && shares)
                    ? ((stock.price / (1 + stock.change / 100)) * -1 + stock.price) * shares : 0;
                  return (
                    <div key={stock.ticker} className="flex items-center justify-between py-3.5 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                          {stock.ticker.slice(0, 4)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{stock.ticker}</p>
                          {editingPortfolio ? (
                            <input
                              type="number" min="0" step="0.01"
                              value={editPortfolio[stock.ticker] || ''}
                              onChange={e => setEditPortfolio(prev => ({ ...prev, [stock.ticker]: e.target.value }))}
                              placeholder="0 shares"
                              className="mt-0.5 w-24 rounded-lg border border-neutral-200 px-2 py-1 text-xs outline-none focus:border-neutral-400"
                            />
                          ) : (
                            <p className="text-xs text-neutral-400">{shares > 0 ? `${shares} shares` : 'Not tracked'}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{value > 0 ? `$${value.toFixed(2)}` : '—'}</p>
                        {dayPnl !== 0 && (
                          <p className={`text-xs font-medium ${ dayPnl >= 0 ? 'text-emerald-600' : 'text-red-500' }`}>
                            {dayPnl >= 0 ? '+' : ''}${dayPnl.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── NEWS TAB ── */}
          {tab === 'news' && (
            <section className="px-4 pt-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Latest News</p>
                {newsFilter && (
                  <button onClick={() => setNewsFilter('')}
                    className="text-xs text-blue-500 hover:underline">Show all ✕</button>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                {['', ...Array.from(new Set(news.map(n => n.ticker)))].map(t => (
                  <button key={t || 'all'} onClick={() => setNewsFilter(t)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold border transition ${
                      newsFilter === t ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200'
                    }`}>{t || 'All'}</button>
                ))}
              </div>
              {filteredNews.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-10">No news available right now.</p>
              ) : (
                <div className="space-y-3">
                  {filteredNews.map((item) => {
                    const sentiment = getSentiment(item.headline);
                    return (
                      <article key={item.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                        <div className="mb-2 flex items-center justify-between gap-3 flex-wrap">
                          <span className="rounded-full bg-white border border-neutral-200 px-3 py-1 text-xs font-bold text-neutral-700 shadow-sm">{item.ticker}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${sentiment.color}`}>{sentiment.label}</span>
                          <span className="text-xs text-neutral-400 ml-auto">{item.time}</span>
                        </div>
                        <h2 className="text-sm font-semibold leading-6 text-neutral-900">{item.headline}</h2>
                        {item.summary && (
                          <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{item.summary}</p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-neutral-400">{item.source}</p>
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs font-semibold text-blue-500 hover:underline">Read more →</a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── EXPLORE TAB ── */}
          {tab === 'explore' && (
            <section className="px-4 pt-4 space-y-4">
              <input
                className="w-full rounded-2xl bg-neutral-100 px-4 py-2.5 text-sm outline-none placeholder:text-neutral-400 focus:bg-neutral-50 focus:ring-1 focus:ring-neutral-300"
                placeholder="🔍  Search stocks to add..."
                value={exploreSearch}
                onChange={e => setExploreSearch(e.target.value)}
              />
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">Suggested Stocks</p>
              <div className="grid grid-cols-2 gap-3">
                {exploreFiltered.map(ticker => {
                  const inWatchlist = stocks.find(s => s.ticker === ticker);
                  return (
                    <button
                      key={ticker}
                      onClick={() => {
                        if (!inWatchlist) {
                          const updated = [...extraTickers, ticker];
                          setExtraTickers(updated);
                          lsSet(LS_EXTRA, updated);
                          fetchData();
                        }
                      }}
                      className="rounded-2xl border border-neutral-200 bg-white p-4 text-left hover:bg-neutral-50 hover:border-neutral-300 transition"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white mb-2">
                        {ticker.slice(0, 4)}
                      </div>
                      <p className="text-sm font-bold">{ticker}</p>
                      <p className="text-xs text-emerald-600 font-semibold mt-1">+ Add to watchlist</p>
                    </button>
                  );
                })}
              </div>
              {exploreFiltered.length === 0 && (
                <p className="text-center text-sm text-neutral-400 py-10">All suggestions already in your watchlist!</p>
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
            <button onClick={() => setTab('portfolio')} className={`flex flex-col items-center gap-1 transition ${tab === 'portfolio' ? 'text-neutral-900' : 'text-neutral-400'}`}>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={tab === 'portfolio' ? 2.5 : 1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              <span className="text-xs font-medium">Portfolio</span>
            </button>
            <button onClick={() => { setTab('news'); setNewsFilter(''); }} className={`flex flex-col items-center gap-1 transition ${tab === 'news' ? 'text-neutral-900' : 'text-neutral-400'}`}>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={tab === 'news' ? 2.5 : 1.8} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6m-6 4h6" /></svg>
              <span className="text-xs font-medium">News</span>
            </button>
            <button onClick={() => setTab('explore')} className={`flex flex-col items-center gap-1 transition ${tab === 'explore' ? 'text-neutral-900' : 'text-neutral-400'}`}>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={tab === 'explore' ? 2.5 : 1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span className="text-xs font-medium">Explore</span>
            </button>
          </div>
        </nav>

      </div>
    </div>
  );
}
