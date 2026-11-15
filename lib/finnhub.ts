export type UpstreamIssue = 'auth' | 'rate_limit' | 'unavailable';

/** Shown when the server has no key. The key value is never included. */
export const MISSING_KEY_MESSAGE =
  'Market data is unavailable because FINNHUB_API_KEY is not set on the server.';

export function readFinnhubKey(): string | null {
  const key = process.env.FINNHUB_API_KEY?.trim();
  return key ? key : null;
}

export function failureMessage(issue: UpstreamIssue): string {
  if (issue === 'auth') {
    return 'The market data provider rejected FINNHUB_API_KEY. Check the key in the server environment.';
  }
  if (issue === 'rate_limit') {
    return 'The market data provider rate limit was reached. Wait a minute, then refresh.';
  }
  return 'The market data provider did not respond. Try again in a moment.';
}

export function issueFromStatus(status: number): UpstreamIssue | null {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status === 0 || status >= 500) return 'unavailable';
  return null;
}

export function issueFromBody(body: unknown): UpstreamIssue | null {
  if (!body || typeof body !== 'object' || !('error' in body)) return null;
  const message = String((body as { error: unknown }).error).toLowerCase();
  if (message.includes('api key') || message.includes('access token')) return 'auth';
  if (message.includes('limit') || message.includes('rate')) return 'rate_limit';
  return 'unavailable';
}

/**
 * Calls Finnhub. `path` must be a path plus query, without the token.
 * The token is appended here and is never written to logs.
 */
export async function fetchFinnhub(path: string, key: string): Promise<{ body: unknown; issue: UpstreamIssue | null }> {
  const url = new URL(path, 'https://finnhub.io');
  url.searchParams.set('token', key);

  try {
    const res = await fetch(url, { cache: 'no-store' });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    const issue = !res.ok ? (issueFromStatus(res.status) ?? 'unavailable') : issueFromBody(body);
    return { body, issue };
  } catch {
    return { body: null, issue: 'unavailable' };
  }
}

export function dominantIssue(issues: Array<UpstreamIssue | null>): UpstreamIssue {
  if (issues.includes('auth')) return 'auth';
  if (issues.includes('rate_limit')) return 'rate_limit';
  return 'unavailable';
}

export function statusForIssue(issue: UpstreamIssue): number {
  return issue === 'rate_limit' ? 503 : 502;
}
