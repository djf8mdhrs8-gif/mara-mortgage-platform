import { Image, StyleSheet, Text, View } from 'react-native';

import wordmark from '../../assets/branding/chl-wordmark-white.png';
import { PrimaryButton } from './PrimaryButton';
import { colors, spacing, typography } from '@/theme/tokens';

interface LockScreenProps {
  onUnlock: () => void;
  onSignOut: () => void;
}

/** Shown while the app is biometrically locked (cold start / return from background). */
export function LockScreen({ onUnlock, onSignOut }: LockScreenProps) {
  return (
    <View style={styles.container}>
      <Image
        source={wordmark}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Certified Home Loans"
      />
      <Text style={styles.subtitle}>Unlock with Face ID / fingerprint to continue.</Text>
      <View style={styles.actions}>
        <PrimaryButton title="Unlock" onPress={onUnlock} />
        <Text style={styles.signOut} onPress={onSignOut} accessibilityRole="button">
          Sign out instead
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  logo: {
    width: 224,
    height: 52,
  },
  subtitle: {
    ...typography.body,
    color: colors.textOnPrimary,
    opacity: 0.8,
    textAlign: 'center',
  },
  actions: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
    gap: spacing.md,
    alignItems: 'center',
  },
  signOut: {
    ...typography.body,
    color: colors.textOnPrimary,
    opacity: 0.7,
    textDecorationLine: 'underline',
  },
});
