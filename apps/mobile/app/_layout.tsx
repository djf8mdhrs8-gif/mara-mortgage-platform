import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/features/auth/store';
import { useCalculatorConfig } from '@/features/config/useCalculatorConfig';
import { useBiometricLock } from '@/features/auth/useBiometricLock';
import { useLogout } from '@/features/auth/useAuth';
import { useSessionRestore } from '@/features/auth/useSessionRestore';
import { usePushRegistration } from '@/features/notifications/usePushRegistration';
import { LockScreen } from '@/components/LockScreen';

// Crash reporting. With no DSN configured (local dev default) the SDK is
// disabled entirely — no network calls, no console noise.
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
Sentry.init({
  dsn: sentryDsn,
  enabled: sentryDsn !== undefined && sentryDsn !== '',
  // PII (emails, tokens, document names) must not ride along by default.
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
});

// Keep the native splash visible until session restore decides where we land —
// a returning user must never see a login-screen flash.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Readable by anyone, signed in or not. The privacy policy in particular must
// answer at a public URL: both app stores require it, and prospective
// borrowers reach it from the sign-in screen before they have an account.
const PUBLIC_ROUTES = new Set(['privacy', 'legal']);

/** Redirects based on session state: signed out → (auth), signed in → (tabs). */
function useAuthGate() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'restoring') return;
    const inAuthGroup = segments[0] === '(auth)';
    const isPublic = segments.length > 0 && PUBLIC_ROUTES.has(segments[0]);
    if (user === null && !inAuthGroup && !isPublic) {
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

function RootLayout() {
  // useState (not module scope) so a QueryClient is never shared across
  // React refresh boundaries in dev.
  const [queryClient] = useState(() => new QueryClient());
  const status = useAuthStore((s) => s.status);
  const { lock, unlock } = useBiometricLock();

  useSessionRestore();
  useAuthGate();
  usePushRegistration();

  // Admin-tunable calculator settings — refetch whenever a session lands so
  // hub visibility and default assumptions reflect the latest config.
  const refreshConfig = useCalculatorConfig((s) => s.refresh);
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (user !== null) void refreshConfig();
  }, [user, refreshConfig]);

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
          <Stack.Screen
            name="messages"
            options={{
              headerShown: true,
              title: 'Messages',
              headerStyle: { backgroundColor: '#0F2A4A' },
              headerTintColor: '#FFFFFF',
            }}
          />
        </Stack>
      )}
    </QueryClientProvider>
  );
}

// Sentry.wrap adds the crash boundary + touch-event breadcrumbs around the app.
export default Sentry.wrap(RootLayout);
