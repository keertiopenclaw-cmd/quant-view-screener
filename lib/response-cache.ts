type CacheEntry<T> = { expires: number; value: T };

const cache = new Map<string, CacheEntry<unknown>>();

/** Short-lived cache so a refresh and a second visitor do not each call Finnhub. */
export const MARKET_CACHE_MS = 20_000;

export function readCache<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.value as T;
}

export function writeCache<T>(key: string, value: T, ttlMs = MARKET_CACHE_MS) {
  if (cache.size > 40) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { expires: Date.now() + ttlMs, value });
}
