import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAuthStore } from '@/features/auth/store';
import { api } from '@/lib/api';

// Show notifications while the app is foregrounded too.
Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
});

async function obtainExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) {
    return null; // web preview and simulators can't receive push
  }

  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted
    ? existing
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId: string | undefined =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
      ?.projectId ?? Constants.easConfig?.projectId ?? undefined;

  const result = await Notifications.getExpoPushTokenAsync(
    projectId === undefined ? undefined : { projectId },
  );
  return result.data;
}

/**
 * After sign-in on a real device: ask permission, fetch the Expo push token,
 * and register it with the API. Fails silently — push is an enhancement,
 * never a blocker (web, simulators, denied permission, no EAS project yet).
 */
export function usePushRegistration(): void {
  const user = useAuthStore((s) => s.user);
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (user === null || registeredFor.current === user.id) return;

    void (async () => {
      try {
        const token = await obtainExpoPushToken();
        if (token === null) return;
        await api.POST('/api/v1/notifications/token', {
          body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
        });
        registeredFor.current = user.id;
      } catch {
        // silent: push registration must never disturb the session
      }
    })();
  }, [user]);
}
