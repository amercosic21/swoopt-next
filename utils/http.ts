// Small client-side fetch helpers. Centralizes the repeated
// POST + JSON headers + JSON.stringify boilerplate used across the UI.

/** POST a JSON body and return the parsed JSON response (or `{}` on parse failure). */
export async function postJson<T = unknown>(url: string, body: unknown): Promise<{ ok: boolean; data: T }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({} as T));
  return { ok: res.ok, data: data as T };
}

/** Fire-and-forget POST of a JSON body; swallows network errors. */
export function postJsonVoid(url: string, body: unknown): Promise<void> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(() => undefined).catch(() => undefined);
}
