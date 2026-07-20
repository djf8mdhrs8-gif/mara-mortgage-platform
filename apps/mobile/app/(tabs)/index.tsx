import { StyleSheet, Text, View } from 'react-native';

import { useHealth } from '@/features/health/useHealth';
import { colors, radii, spacing, typography } from '@/theme/tokens';

function ApiStatusCard() {
  const { data, isPending, isError } = useHealth();

  const [label, detail, tone] = isPending
    ? ['Connecting…', 'Reaching the Mara Mortgage API', colors.textSecondary]
    : isError
      ? ['Offline', 'API unreachable — is the backend running?', colors.error]
      : [
          'Connected',
          `API ${data.status} · database ${data.db} · up ${data.uptimeSeconds}s`,
          colors.success,
        ];

  return (
    <View style={styles.card}>
      <View style={[styles.dot, { backgroundColor: tone }]} />
      <View style={styles.cardText}>
        <Text style={[styles.cardTitle, { color: tone }]}>{label}</Text>
        <Text style={styles.cardDetail}>{detail}</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mara Mortgage</Text>
      <Text style={styles.subtitle}>
        Your path from pre-qualification to closing starts here.
      </Text>
      <ApiStatusCard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    minWidth: 280,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radii.pill,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  cardDetail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
