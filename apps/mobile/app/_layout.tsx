import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/features/auth/store';
import { useBiometricLock } from '@/features/auth/useBiometricLock';
import { useLogout } from '@/features/auth/useAuth';
import { useSessionRestore } from '@/features/auth/useSessionRestore';
import { usePushRegistration } from '@/features/notifications/usePushRegistration';
import { LockScreen } from '@/components/LockScreen';

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

function LockedGate({ unlock }: { unlock: () => Promise<boolean> }) {
  const logout = useLogout();
  return <LockScreen onUnlock={() => void unlock()} onSignOut={() => logout.mutate()} />;
}

export default function RootLayout() {
  // useState (not module scope) so a QueryClient is never shared across
  // React refresh boundaries in dev.
  const [queryClient] = useState(() => new QueryClient());
  const status = useAuthStore((s) => s.status);
  const { lock, unlock } = useBiometricLock();

  useSessionRestore();
  useAuthGate();
  usePushRegistration();

  const booting = status === 'restoring' || lock === 'pending';

  useEffect(() => {
    if (!booting) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [booting]);

  if (booting) {
    // Native: splash stays up. Web preview: brief blank frame instead of a flicker.
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      {lock === 'locked' ? (
        <LockedGate unlock={unlock} />
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      )}
    </QueryClientProvider>
  );
}
