import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/features/auth/store';
import { useSessionRestore } from '@/features/auth/useSessionRestore';

// Keep the native splash visible until session restore decides where we land —
// a returning user must never see a login-screen flash.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Redirects based on session state: signed out → (auth), signed in → (tabs). */
function useAuthGate() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'restoring') return;
    const inAuthGroup = segments[0] === '(auth)';
    if (user === null && !inAuthGroup) {
      router.replace('/login');
    } else if (user !== null && inAuthGroup) {
      router.replace('/');
    }
  }, [status, user, segments, router]);
}

export default function RootLayout() {
  // useState (not module scope) so a QueryClient is never shared across
  // React refresh boundaries in dev.
  const [queryClient] = useState(() => new QueryClient());
  const status = useAuthStore((s) => s.status);

  useSessionRestore();
  useAuthGate();

  useEffect(() => {
    if (status === 'ready') {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [status]);

  if (status === 'restoring') {
    // Native: splash stays up. Web preview: brief blank frame instead of a flicker.
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </QueryClientProvider>
  );
}
