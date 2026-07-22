import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  StatusTimeline,
  type ApplicationStatus,
} from '@/features/applications/StatusTimeline';
import { useApplications, useStartApplication } from '@/features/applications/useApplications';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radii, spacing, typography } from '@/theme/tokens';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ApplicationScreen() {
  const { data, isPending, isError, refetch, isRefetching } = useApplications();
  const start = useStartApplication();

  const latest = data?.[0];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
    >
      {isPending ? (
        <Text style={styles.muted}>Loading your application…</Text>
      ) : isError ? (
        <Text style={styles.error}>
          Couldn’t load your application — pull down to retry.
        </Text>
      ) : latest === undefined ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Ready when you are</Text>
          <Text style={styles.emptyDetail}>
            Start your mortgage application and track every milestone here — from submission to
            clear-to-close.
          </Text>
          <PrimaryButton
            title="Start my application"
            onPress={() => start.mutate()}
            loading={start.isPending}
          />
          {start.isError ? <Text style={styles.error}>{start.error.message}</Text> : null}
        </View>
      ) : (
        <>
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>Your application</Text>
            <Text style={styles.headerDetail}>
              Started {formatDate(latest.createdAt)} · Updated {formatDate(latest.updatedAt)}
              {latest.ariveLoanId !== null ? ` · Loan #${latest.ariveLoanId}` : ''}
            </Text>
          </View>
          <StatusTimeline status={latest.status as ApplicationStatus} />
          <Text style={styles.footnote}>
            Status updates appear here automatically as your loan progresses. Questions? Head to
            the Contact tab any time.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  emptyDetail: {
    ...typography.body,
    color: colors.textSecondary,
  },
  headerCard: {
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  headerDetail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footnote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
