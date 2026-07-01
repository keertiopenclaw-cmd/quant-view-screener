import { NextResponse } from 'next/server';

const news = [
  {
    id: 1,
    ticker: 'NVDA',
    headline: 'Nvidia data center revenue accelerates as AI infrastructure spending hits new highs',
    source: 'Clouds News',
    time: '2m ago',
  },
  {
    id: 2,
    ticker: 'MSFT',
    headline: 'Microsoft Azure growth re-accelerates driven by enterprise Copilot adoption',
    source: 'Clouds News',
    time: '14m ago',
  },
  {
    id: 3,
    ticker: 'AMZN',
    headline: 'Amazon AWS margin expansion continues as cost optimisation cycle matures',
    source: 'Clouds News',
    time: '31m ago',
  },
  {
    id: 4,
    ticker: 'TSLA',
    headline: 'Tesla shares volatile as investors balance delivery outlook vs FSD progress',
    source: 'Clouds News',
    time: '45m ago',
  },
  {
    id: 5,
    ticker: 'META',
    headline: 'Meta ad revenue holds firm while Llama AI investments accelerate',
    source: 'Clouds News',
    time: '58m ago',
  },
  {
    id: 6,
    ticker: 'GOOGL',
    headline: 'Google Search resilient; Gemini integration across Workspace gains traction',
    source: 'Clouds News',
    time: '1h ago',
  },
  {
    id: 7,
    ticker: 'AMD',
    headline: 'AMD MI300X gaining share in AI inference as hyperscaler demand broadens',
    source: 'Clouds News',
    time: '1h 15m ago',
  },
  {
    id: 8,
    ticker: 'AAPL',
    headline: 'Apple Services revenue hits record; iPhone 16 cycle showing steady demand',
    source: 'Clouds News',
    time: '1h 30m ago',
  },
];

export async function GET() {
  return NextResponse.json(news);
}
