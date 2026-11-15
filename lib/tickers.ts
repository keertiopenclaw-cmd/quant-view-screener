/** Tickers accepted from the address bar and the add-ticker box. */
export const TICKER_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/;

/** Custom symbols on top of the built-in watchlist. Keeps provider usage bounded. */
export const MAX_EXTRA_TICKERS = 15;

export function sanitizeTickers(values: string[], limit = MAX_EXTRA_TICKERS): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const value of values) {
    const ticker = value.trim().toUpperCase();
    if (!TICKER_PATTERN.test(ticker) || seen.has(ticker)) continue;
    seen.add(ticker);
    cleaned.push(ticker);
    if (cleaned.length >= limit) break;
  }

  return cleaned;
}
