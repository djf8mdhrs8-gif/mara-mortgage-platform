import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from './store';
import { api } from '@/lib/api';

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data, error, response } = await api.POST('/api/v1/auth/register', {
        body: input,
      });
      if (error !== undefined || data === undefined) {
        throw new Error(
          response.status === 409 ? 'That email is already registered.' : 'Registration failed.',
        );
      }
      return data;
    },
    onSuccess: (data) => setSession(data),
  });
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data, error, response } = await api.POST('/api/v1/auth/login', { body: input });
      if (error !== undefined || data === undefined) {
        throw new Error(
          response.status === 401 ? 'Wrong email or password.' : 'Sign-in failed.',
        );
      }
      return data;
    },
    onSuccess: (data) => setSession(data),
  });
}

export function useLogout() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);
  return useMutation({
    mutationFn: async () => {
      if (refreshToken !== null) {
        // Best-effort server-side revocation; local sign-out happens regardless.
        await api.POST('/api/v1/auth/logout', { body: { refreshToken } }).catch(() => undefined);
      }
    },
    onSettled: () => clearSession(),
  });
}
