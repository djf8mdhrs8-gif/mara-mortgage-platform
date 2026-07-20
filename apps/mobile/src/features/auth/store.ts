import { create } from 'zustand';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'BORROWER' | 'REALTOR' | 'LOAN_OFFICER' | 'ADMIN';
}

interface AuthState {
  user: SessionUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: {
    user: SessionUser;
    accessToken: string;
    refreshToken: string;
  }) => void;
  clearSession: () => void;
}

/**
 * In-memory session only (cleared on app restart). Milestone 10 moves the
 * refresh token into expo-secure-store and adds silent session restore.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  setSession: ({ user, accessToken, refreshToken }) =>
    set({ user, accessToken, refreshToken }),
  clearSession: () => set({ user: null, accessToken: null, refreshToken: null }),
}));
