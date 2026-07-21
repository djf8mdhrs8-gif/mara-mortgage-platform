import { create } from 'zustand';

import { clearStoredRefreshToken, setStoredRefreshToken } from './tokenStorage';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'BORROWER' | 'REALTOR' | 'LOAN_OFFICER' | 'ADMIN';
}

interface AuthState {
  /** 'restoring' until the startup session-restore attempt finishes. */
  status: 'restoring' | 'ready';
  user: SessionUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: {
    user: SessionUser;
    accessToken: string;
    refreshToken: string;
  }) => void;
  clearSession: () => void;
  setReady: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'restoring',
  user: null,
  accessToken: null,
  refreshToken: null,
  setSession: ({ user, accessToken, refreshToken }) => {
    set({ user, accessToken, refreshToken, status: 'ready' });
    // Fire-and-forget: UI must not wait on Keychain writes.
    void setStoredRefreshToken(refreshToken);
  },
  clearSession: () => {
    set({ user: null, accessToken: null, refreshToken: null, status: 'ready' });
    void clearStoredRefreshToken();
  },
  setReady: () => set({ status: 'ready' }),
}));
