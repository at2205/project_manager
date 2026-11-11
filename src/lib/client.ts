// Thin fetch wrapper used by the Redux thunks. Auth travels in an httpOnly cookie.
export async function http<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export const send = <T>(method: string, url: string, body?: unknown) =>
  http<T>(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });
