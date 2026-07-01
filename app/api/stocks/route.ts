import { NextResponse } from 'next/server';

const stocks = [
  { ticker: 'NVDA', price: 131.38, change: 2.14, pe: 48.2, summary: 'AI chip demand surges; data center revenue up 427% YoY' },
  { ticker: 'AAPL', price: 194.03, change: 0.87, pe: 32.1, summary: 'iPhone 16 cycle strong; services revenue hits record' },
  { ticker: 'MSFT', price: 415.60, change: 1.02, pe: 35.7, summary: 'Azure AI growth accelerating; Copilot adoption broadening' },
  { ticker: 'GOOGL', price: 174.50, change: -0.34, pe: 22.8, summary: 'Ad revenue resilient; Gemini integration across products' },
  { ticker: 'META', price: 503.80, change: 1.55, pe: 27.4, summary: 'Ad impressions up 10%; Llama 3 driving platform efficiency' },
  { ticker: 'TSLA', price: 178.20, change: -1.22, pe: 55.3, summary: 'Delivery miss concerns; FSD progress cited as catalyst' },
  { ticker: 'AMZN', price: 184.70, change: 0.65, pe: 41.6, summary: 'AWS reacceleration; retail margins hitting new highs' },
  { ticker: 'AMD',  price: 164.90, change: 3.21, pe: 44.1, summary: 'MI300X gaining share; AI inference demand strong' },
];

export async function GET() {
  return NextResponse.json(stocks);
}
