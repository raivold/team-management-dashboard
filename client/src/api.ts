// API client — talks to the same /api/* endpoints as the vanilla frontend.
// All rules are enforced server-side; actorId is the demo "Acting as" auth.
import type { State } from './lib';

export async function fetchState(actorId: number): Promise<State> {
  const res = await fetch('/api/state?actorId=' + actorId);
  if (!res.ok) throw new Error('Request failed (' + res.status + ')');
  return res.json();
}

export async function api(path: string, method = 'GET', body: any, actorId: number): Promise<any> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify({ ...body, actorId }) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function readFileAsDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}
