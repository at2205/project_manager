// Minimal in-memory limiter for failed logins (per IP + email).
// Note: state is per server instance — on serverless/multi-instance hosts use a shared store (e.g. Redis) instead.
const WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES = 5;

type Entry = { count: number; resetAt: number };
const g = globalThis as unknown as { _loginFailures?: Map<string, Entry> };
const failures = (g._loginFailures ??= new Map<string, Entry>());

function live(key: string) {
  const e = failures.get(key);
  if (e && e.resetAt <= Date.now()) {
    failures.delete(key);
    return undefined;
  }
  return e;
}

/** Seconds until the caller may retry, or 0 if allowed. */
export function retryAfterSeconds(key: string): number {
  const e = live(key);
  return e && e.count >= MAX_FAILURES ? Math.ceil((e.resetAt - Date.now()) / 1000) : 0;
}

export function recordFailure(key: string) {
  if (failures.size > 5000) for (const k of failures.keys()) live(k); // prune expired entries
  const e = live(key);
  if (e) e.count++;
  else failures.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
}

export const clearFailures = (key: string) => void failures.delete(key);
export const resetAllFailures = () => failures.clear();
