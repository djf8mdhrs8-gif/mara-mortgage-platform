import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'mara.refreshToken';

/**
 * Refresh-token persistence.
 * - Native: expo-secure-store (iOS Keychain / Android Keystore).
 * - Web (dev preview only): localStorage — acceptable for local development,
 *   never exposed to production users; the shipped product is the native app.
 */
export async function getStoredRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
  }
  return SecureStore.getItemAsync(KEY);
}

export async function setStoredRefreshToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, token);
    return;
  }
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearStoredRefreshToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
