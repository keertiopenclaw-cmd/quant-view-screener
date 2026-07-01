'use client';
import React, { useState, useEffect } from 'react';

type Stock = {
  ticker: string;
  price: number;
  change: number;
  pe: number | string;
  summary: string;
};

export default function StockDashboard() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStocks = async () => {
    try {
      const res = await fetch('/api/stocks');
      const data = await res.json();
      setStocks(data);
    } catch (err) {
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white font-mono">
        LOADING_MARKETS...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Quant<span className="text-blue-500">View</span>
          </h1>
          <p className="text-slate-400 mt-2">Google-Grade Portfolio Intelligence</p>
        </div>
        <div className="text-right font-mono text-sm text-slate-500">
          LIVE UPDATES: ACTIVE <br />
          S&amp;P 500: <span className="text-green-400">+0.42%</span>
        </div>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
              <th className="p-4 font-medium">Ticker</th>
              <th className="p-4 font-medium">Price</th>
              <th className="p-4 font-medium">Change</th>
              <th className="p-4 font-medium">P/E Ratio</th>
              <th className="p-4 font-medium">AI 24h Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {stocks.map((stock) => (
              <tr key={stock.ticker} className="hover:bg-slate-800/30 transition-colors group">
                <td className="p-4 font-bold text-white group-hover:text-blue-400">{stock.ticker}</td>
                <td className="p-4 font-mono text-white">${stock.price}</td>
                <td className={`p-4 font-mono ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change)}%
                </td>
                <td className="p-4 text-slate-400">{stock.pe}</td>
                <td className="p-4 text-sm text-slate-300 italic max-w-xs truncate">
                  &quot;{stock.summary}&quot;
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
