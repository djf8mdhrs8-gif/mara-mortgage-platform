'use client';

/**
 * Admin session management — deliberately stricter than the mobile app:
 * tokens live in sessionStorage (gone when the tab closes), there is no
 * silent refresh (a 15-minute access token means re-login), and non-admin
 * logins are rejected client-side AND their refresh token revoked.
 * The real enforcement is server-side (RolesGuard on every admin endpoint);
 * this layer is UX.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const SESSION_KEY = 'mara.admin.session';

export interface AdminSession {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export function getSession(): AdminSession | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export async function login(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { ok: false, error: 'Cannot reach the API — is it running?' };
  }

  if (!response.ok) {
    return { ok: false, error: 'Wrong email or password.' };
  }

  const session = (await response.json()) as AdminSession;
  if (session.user.role !== 'ADMIN') {
    // Not an admin: revoke the tokens we were just issued and reject.
    void fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    }).catch(() => undefined);
    return { ok: false, error: 'This dashboard is for administrators only.' };
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true };
}

export function logout(): void {
  const session = getSession();
  if (session !== null) {
    void fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    }).catch(() => undefined);
  }
  sessionStorage.removeItem(SESSION_KEY);
}

/** Authenticated fetch against the API; throws on 401 so callers can force re-login. */
export async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = getSession();
  const headers = new Headers(init?.headers);
  if (session !== null) headers.set('Authorization', `Bearer ${session.accessToken}`);
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401) {
    sessionStorage.removeItem(SESSION_KEY);
    throw new Error('session expired');
  }
  return response;
}
