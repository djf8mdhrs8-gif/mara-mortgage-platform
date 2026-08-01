import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { exportScenarioPdf } from '@/features/scenarios/exportScenarioPdf';
import { summarize, TYPE_LABELS } from '@/features/scenarios/summarize';
import {
  useDeleteScenario,
  useScenarios,
  useToggleFavorite,
  type Scenario,
} from '@/features/scenarios/useScenarios';
import { colors, radii, spacing, typography } from '@/theme/tokens';

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Saved scenarios: newest first, tap two of the same type to compare them
 * side by side. Selecting a scenario of a different type restarts the
 * selection — cross-type comparisons aren't meaningful.
 */
export default function SavedScenariosScreen() {
  const { data, isLoading, isError } = useScenarios();
  const remove = useDeleteScenario();
  const toggleFavorite = useToggleFavorite();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const share = (scenario: Scenario): void => {
    setSharingId(scenario.id);
    exportScenarioPdf(scenario.id, scenario.name)
      .catch(() => undefined) // share-sheet dismissal and network errors both land here
      .finally(() => setSharingId(null));
  };

  const scenarios = data ?? [];
  const selected = scenarios.filter((s) => selectedIds.includes(s.id));

  const toggle = (scenario: Scenario): void => {
    setSelectedIds((current) => {
      if (current.includes(scenario.id)) {
        return current.filter((id) => id !== scenario.id);
      }
      const currentType = scenarios.find((s) => s.id === current[0])?.type;
      // New type or already two picked → start a fresh selection.
      if (currentType !== undefined && currentType !== scenario.type) {
        return [scenario.id];
      }
      return current.length >= 2 ? [current[1]!, scenario.id] : [...current, scenario.id];
    });
  };

  const comparison = useMemo(() => {
    if (selected.length !== 2) return null;
    const [a, b] = selected as [Scenario, Scenario];
    const rowsA = summarize(a);
    const rowsB = new Map(summarize(b));
    const labels = [...new Set([...rowsA.map(([label]) => label), ...rowsB.keys()])];
    const mapA = new Map(rowsA);
    return labels.map((label) => ({
      label,
      a: mapA.get(label) ?? '—',
      b: rowsB.get(label) ?? '—',
    }));
  }, [selected]);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      {isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {isError ? (
        <Text style={styles.mutedText}>Couldn&rsquo;t load your saved scenarios — pull to retry.</Text>
      ) : null}
      {!isLoading && !isError && scenarios.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.mutedText}>
            Run any calculator and tap &ldquo;Save scenario&rdquo; — saved runs show up here, ready
            to compare side by side.
          </Text>
        </View>
      ) : null}

      {scenarios.length > 0 ? (
        <Text style={styles.hint} testID="saved-hint">
          {selected.length === 2
            ? 'Comparing — tap a scenario to swap it out.'
            : 'Tap two scenarios of the same kind to compare them.'}
        </Text>
      ) : null}

      {scenarios.map((scenario) => {
        const isSelected = selectedIds.includes(scenario.id);
        return (
          <Pressable
            key={scenario.id}
            onPress={() => toggle(scenario)}
            style={[styles.card, isSelected && styles.cardSelected]}
            testID={`saved-${scenario.id}`}
          >
            <View style={styles.cardHeader}>
              <Pressable
                onPress={() =>
                  toggleFavorite.mutate({ id: scenario.id, favorite: !scenario.favorite })
                }
                hitSlop={10}
                testID={`saved-star-${scenario.id}`}
              >
                <Text style={[styles.starText, scenario.favorite && styles.starActive]}>
                  {scenario.favorite ? '★' : '☆'}
                </Text>
              </Pressable>
              <View style={styles.flex}>
                <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                  {scenario.name}
                </Text>
                <Text style={[styles.cardMeta, isSelected && styles.cardMetaSelected]}>
                  {TYPE_LABELS[scenario.type]} · {dateLabel(scenario.createdAt)}
                </Text>
              </View>
              <Pressable
                onPress={() => share(scenario)}
                hitSlop={10}
                disabled={sharingId !== null}
                testID={`saved-share-${scenario.id}`}
              >
                <Text style={[styles.shareText, isSelected && styles.cardTitleSelected]}>
                  {sharingId === scenario.id ? '…' : 'Send'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSelectedIds((current) => current.filter((id) => id !== scenario.id));
                  remove.mutate(scenario.id);
                }}
                hitSlop={10}
                testID={`saved-delete-${scenario.id}`}
              >
                <Text style={[styles.deleteText, isSelected && styles.cardMetaSelected]}>✕</Text>
              </Pressable>
            </View>
            {!isSelected ? (
              <Text style={styles.cardSummary} numberOfLines={1}>
                {summarize(scenario)
                  .slice(0, 2)
                  .map(([label, value]) => `${label}: ${value}`)
                  .join(' · ')}
              </Text>
            ) : null}
          </Pressable>
        );
      })}

      {comparison !== null && selected.length === 2 ? (
        <View style={styles.compare} testID="compare-table">
          <View style={styles.compareRow}>
            <Text style={styles.compareLabel} />
            <Text style={styles.compareHeading} numberOfLines={1}>
              {selected[0]!.name}
            </Text>
            <Text style={styles.compareHeading} numberOfLines={1}>
              {selected[1]!.name}
            </Text>
          </View>
          {comparison.map((row) => (
            <View key={row.label} style={styles.compareRow}>
              <Text style={styles.compareLabel}>{row.label}</Text>
              <Text style={styles.compareValue}>{row.a}</Text>
              <Text style={styles.compareValue}>{row.b}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  empty: {
    marginTop: spacing.xl,
    gap: spacing.xs,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.heading,
    fontSize: 18,
    color: colors.textPrimary,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  cardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardTitleSelected: {
    color: colors.textOnPrimary,
  },
  cardMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cardMetaSelected: {
    color: '#B9C8D8',
  },
  cardSummary: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  deleteText: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: 4,
  },
  starText: {
    fontSize: 20,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  starActive: {
    color: colors.accent,
  },
  shareText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryLight,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  compare: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 6,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compareLabel: {
    flex: 1.2,
    ...typography.caption,
    color: colors.textSecondary,
  },
  compareHeading: {
    flex: 1,
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  compareValue: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  mutedText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
