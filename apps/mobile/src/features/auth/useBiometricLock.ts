import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { isBiometricAvailable, promptBiometricUnlock } from './biometric';
import { useAuthStore } from './store';

export type LockState = 'pending' | 'locked' | 'unlocked';

/**
 * Biometric access gate:
 * - Cold start: if a session was restored and biometrics are available,
 *   start locked and prompt immediately.
 * - Backgrounding the app re-locks it; returning prompts again.
 * - Fresh logins are NOT locked (the user just proved who they are).
 */
export function useBiometricLock(): { lock: LockState; unlock: () => Promise<boolean> } {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const [lock, setLock] = useState<LockState>('pending');
  const available = useRef(false);
  const coldStartHandled = useRef(false);
  const prompting = useRef(false);

  const unlock = useCallback(async (): Promise<boolean> => {
    if (prompting.current) return false;
    prompting.current = true;
    try {
      const ok = await promptBiometricUnlock();
      if (ok) setLock('unlocked');
      return ok;
    } finally {
      prompting.current = false;
    }
  }, []);

  // Cold-start decision, made exactly once when session restore settles.
  useEffect(() => {
    if (status !== 'ready' || coldStartHandled.current) return;
    coldStartHandled.current = true;

    void (async () => {
      available.current = await isBiometricAvailable();
      const restoredSession = useAuthStore.getState().user !== null;
      if (available.current && restoredSession) {
        setLock('locked');
        void unlock();
      } else {
        setLock('unlocked');
      }
    })();
  }, [status, unlock]);

  // Re-lock on background, prompt again on return.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (!available.current) return;
      const signedIn = useAuthStore.getState().user !== null;
      if (state === 'background' && signedIn) {
        setLock('locked');
      } else if (state === 'active' && signedIn) {
        setLock((current) => {
          if (current === 'locked') void unlock();
          return current;
        });
      }
    });
    return () => sub.remove();
  }, [unlock]);

  // Signing out dissolves the lock (nothing left to protect).
  const effectiveLock: LockState = user === null && lock === 'locked' ? 'unlocked' : lock;

  return { lock: effectiveLock, unlock };
}
