# Quant View

Quant View is a personal markets dashboard. It shows a grouped stock watchlist, an estimated portfolio value from share counts you type in, company headlines, and a short list of symbols you can add.

The running app is the Next.js project in this folder. It is deployed at [quant-view-screener.vercel.app](https://quant-view-screener.vercel.app).

## What the screen does

- **Watchlist** groups a built-in list of US symbols and shows the latest price and daily percent change.
- **Portfolio** multiplies those prices by share counts. The counts stay in this browser. There is no account.
- **News** shows recent headlines for a sample of the watchlist, with a simple bullish, bearish, or neutral label based on words in the headline.
- **Explore** adds extra symbols. Up to 15 custom symbols are sent to the server.

Saved choices use three browser storage keys from the earlier “Clouds” name: `clouds_hidden`, `clouds_extra`, and `clouds_portfolio`. They were left unchanged so existing holdings are not wiped.

## Run it locally

You need Node.js 18 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the local site |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run the Next.js linter |

## Environment variables

Live prices and headlines need one server-side secret. Do not commit it, and do not prefix it with `NEXT_PUBLIC_`. A `NEXT_PUBLIC_` name would ship the key to every browser.

| Variable | Required | Where it is read | What to put |
| --- | --- | --- | --- |
| `FINNHUB_API_KEY` | Yes, for live data | `app/api/stocks/route.ts` and `app/api/news/route.ts` (through `lib/finnhub.ts`) | A Finnhub API token. Create one at [finnhub.io/register](https://finnhub.io/register). |
| `NEXT_PUBLIC_SITE_URL` | No | `app/layout.tsx` | Public site URL used for canonical and social links. Defaults to `https://quant-view-screener.vercel.app`. |

Local setup: copy `.env.example` to `.env.local` and set `FINNHUB_API_KEY` there.

Vercel setup: open the project, go to **Settings → Environment Variables**, add `FINNHUB_API_KEY` for Production, Preview, and Development, then redeploy. The value stays on the server. The browser only calls `/api/stocks` and `/api/news`.

If the key is missing, those routes respond with `503` and the page explains that `FINNHUB_API_KEY` is not set. It does not stay on the loading spinner.

The deployed site was already returning live quotes when this was checked, so production has a working key. A fetch that does not run JavaScript only sees the page shell and the loading message, because prices are requested after the page loads in the browser.

## How the data is loaded

- `/api/stocks` asks Finnhub for a quote per symbol, in batches of 10. Built-in symbols are grouped in `app/api/stocks/route.ts`. Custom symbols arrive as `?extra=COIN,ARM` and must look like tickers.
- `/api/news` asks Finnhub for company news on the first 15 built-in symbols (yesterday and today, UTC). Asking for every symbol on every refresh would spend the provider limit too quickly.
- A successful response is remembered on the server for 20 seconds. The page asks again every 30 seconds, and the Refresh button asks immediately.
- Finnhub’s free plan is limited to 60 calls per minute. One full refresh is about 40 quote calls plus 15 news calls. Confirm the limit on your own plan. A paid plan, or fewer symbols, is the durable fix if refreshes start failing.

Prices can be delayed. Nothing here is investment advice.

## Project layout

| Path | Role |
| --- | --- |
| `app/page.tsx` | The dashboard |
| `app/layout.tsx` | Page title, description, and social preview text |
| `app/api/stocks/route.ts` | Quote route |
| `app/api/news/route.ts` | Headlines route |
| `lib/finnhub.ts` | Finnhub requests and the key check |
| `backend/` | Old Python prototype with fake prices. The Next.js app does not use it. |
| `frontend/` | Leftover layout from an earlier file move. The Next.js app does not use it. |

## Checks

`npm run lint` and `npm run build` should both pass. There is no separate test suite.
