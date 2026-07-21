import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from './store';
import { getStoredRefreshToken } from './tokenStorage';
import { api } from '@/lib/api';

async function refreshSession(refreshToken: string): Promise<boolean> {
  const { data, error } = await api
    .POST('/api/v1/auth/refresh', { body: { refreshToken } })
    .catch(() => ({ data: undefined, error: new Error('network') as unknown }));
  if (error !== undefined || data === undefined) {
    return false;
  }
  useAuthStore.getState().setSession(data);
  return true;
}

/**
 * Silent session restore:
 * - On startup: exchange the stored refresh token for a fresh session before
 *   the navigator renders, so a returning user never sees the login screen.
 * - On foreground resume: rotate again so the access token stays fresh
 *   without any visible interruption.
 */
export function useSessionRestore(): void {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      const stored = await getStoredRefreshToken();
      if (stored === null) {
        useAuthStore.getState().setReady();
        return;
      }
      const ok = await refreshSession(stored);
      if (!ok) {
        // Expired/revoked stored token → clean sign-in required.
        useAuthStore.getState().clearSession();
      }
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const { status, refreshToken } = useAuthStore.getState();
      if (status === 'ready' && refreshToken !== null) {
        void refreshSession(refreshToken);
      }
    });
    return () => sub.remove();
  }, []);
}
