import PostHog from 'posthog-react-native';

/**
 * Product analytics, dormant by default. With no EXPO_PUBLIC_POSTHOG_KEY
 * (local dev, and production until the account exists) `track` is a no-op —
 * no network calls, no queue. First-party pipeline numbers come from the
 * API's /stats endpoint regardless; PostHog adds tap-level behavior.
 */
const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;

const client =
  key !== undefined && key !== ''
    ? new PostHog(key, {
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      })
    : null;

export function track(event: string, properties?: Record<string, string | number>): void {
  client?.capture(event, properties);
}

/** Ties events to the signed-in account (called after login/restore). */
export function identify(userId: string, role: string): void {
  client?.identify(userId, { role });
}

export function resetAnalytics(): void {
  client?.reset();
}
