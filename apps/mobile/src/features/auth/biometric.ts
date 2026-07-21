import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/**
 * Biometric availability: hardware present AND at least one biometric enrolled.
 * Web and biometric-less devices simply skip the lock — the session is still
 * protected by the OS keychain; biometrics add a local access gate on top.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

/** Shows the OS biometric prompt (Face ID / Touch ID / fingerprint). */
export async function promptBiometricUnlock(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Mara Mortgage',
      cancelLabel: 'Cancel',
    });
    return result.success;
  } catch {
    return false;
  }
}
