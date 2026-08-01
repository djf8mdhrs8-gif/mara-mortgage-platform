import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { summarize, TYPE_LABELS } from './summarize';
import { useScenarios, type Scenario } from './useScenarios';
import { colors, radii, spacing, typography } from '@/theme/tokens';

function Row({ scenario, onPress }: { scenario: Scenario; onPress: () => void }) {
  const summary = summarize(scenario)
    .slice(0, 2)
    .map(([label, value]) => `${label}: ${value}`)
    .join(' · ');
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID={`fav-${scenario.id}`}
    >
      <Text style={styles.star}>★</Text>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {scenario.name}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {TYPE_LABELS[scenario.type]} · {summary}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

/**
 * Starred scenarios on the profile/home surface — properties first (that's
 * what buyers pin while house-hunting), then calculations. Renders nothing
 * until something is starred; rows open the saved-scenarios screen.
 */
export function FavoritesSection() {
  const { data } = useScenarios();
  const router = useRouter();

  const favorites = (data ?? []).filter((s) => s.favorite);
  if (favorites.length === 0) return null;

  const properties = favorites.filter((s) => s.type === 'PROPERTY_ANALYSIS');
  const calculations = favorites.filter((s) => s.type !== 'PROPERTY_ANALYSIS');
  const open = (): void => router.push('/calculators/saved');

  return (
    <View style={styles.section} testID="favorites-section">
      <Text style={styles.heading}>Your favorites</Text>
      {properties.length > 0 ? (
        <>
          <Text style={styles.groupLabel}>Properties</Text>
          {properties.map((s) => (
            <Row key={s.id} scenario={s} onPress={open} />
          ))}
        </>
      ) : null}
      {calculations.length > 0 ? (
        <>
          <Text style={styles.groupLabel}>Calculations</Text>
          {calculations.map((s) => (
            <Row key={s.id} scenario={s} onPress={open} />
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  heading: {
    ...typography.heading,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  groupLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.border,
  },
  star: {
    fontSize: 16,
    color: colors.accent,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowDetail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 22,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
