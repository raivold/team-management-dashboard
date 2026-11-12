// API client — talks to the same /api/* endpoints as before.
// Auth: passwords + sessions. Every fetch sends credentials:
// 'same-origin' so the session cookie goes with it. A 401 throws
// AuthError and fires the global handler (registered once by the
// Dashboard), which shows the login page instead of toasting the
// same error on every action.
// actorId is still accepted (and sent) for demo mode, where the old
// "Acting as" switcher is the auth; in login mode the server ignores
// it entirely and takes identity from the session.
import type { State, Person } from './lib';

export class AuthError extends Error {}

export interface Me {
  demo: boolean;
  person?: Person;
  isAdmin?: boolean;
  mustChangePassword?: boolean;
}

// Registered once by the Dashboard; api.ts itself stays UI-free.
let onAuthError: (() => void) | null = null;
export function setOnAuthError(fn: (() => void) | null) { onAuthError = fn; }
function authFailed(e: AuthError): AuthError { onAuthError?.(); return e; }

export async function getMe(): Promise<Me> {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (res.status === 401) throw authFailed(new AuthError('Please log in.'));
  if (!res.ok) throw new Error('Request failed (' + res.status + ')');
  return res.json();
}

export async function login(username: string, password: string): Promise<Me> {
  const res = await fetch('/api/auth/login', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return { demo: false, person: data.person, isAdmin: data.account.isAdmin, mustChangePassword: data.mustChangePassword };
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch('/api/auth/change-password', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function fetchState(actorId?: number): Promise<State> {
  const res = await fetch('/api/state' + (actorId != null ? '?actorId=' + actorId : ''), { credentials: 'same-origin' });
  if (res.status === 401) throw authFailed(new AuthError('Session expired. Please log in again.'));
  if (!res.ok) throw new Error('Request failed (' + res.status + ')');
  return res.json();
}

export async function api(path: string, method = 'GET', body: any, actorId?: number): Promise<any> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(actorId != null ? { ...body, actorId } : body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw authFailed(new AuthError(data.error || 'Session expired. Please log in again.'));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Admin accounts (app admin only; the server enforces it).
export async function adminList(): Promise<any[]> {
  return api('/api/admin/accounts', 'GET', null);
}
export async function adminCreate(personId: number, username: string, password: string, isAdmin: boolean): Promise<any> {
  return api('/api/admin/accounts', 'POST', { personId, username, password, isAdmin });
}
export async function adminResetPassword(id: number, password: string): Promise<any> {
  return api(`/api/admin/accounts/${id}/reset-password`, 'POST', { password });
}
export async function adminSetDisabled(id: number, disabled: boolean): Promise<any> {
  return api(`/api/admin/accounts/${id}/set-disabled`, 'POST', { disabled });
}

export function readFileAsDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}
