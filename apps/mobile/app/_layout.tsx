import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/features/auth/store';

/** Redirects based on session state: signed out → (auth), signed in → (tabs). */
function useAuthGate() {
  const user = useAuthStore((s) => s.user);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    if (user === null && !inAuthGroup) {
      router.replace('/login');
    } else if (user !== null && inAuthGroup) {
      router.replace('/');
    }
  }, [user, segments, router]);
}

export default function RootLayout() {
  // useState (not module scope) so a QueryClient is never shared across
  // React refresh boundaries in dev.
  const [queryClient] = useState(() => new QueryClient());
  useAuthGate();

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
