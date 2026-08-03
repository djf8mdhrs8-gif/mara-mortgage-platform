import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import {
  StatusTimeline,
  type ApplicationStatus,
} from '@/features/applications/StatusTimeline';
import { DocumentsSection } from '@/features/documents/DocumentsSection';
import {
  useApplications,
  useAriveLink,
  useStartApplication,
} from '@/features/applications/useApplications';
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
  const ariveLink = useAriveLink();

  const latest = data?.[0];

  const openPortal = () => {
    const url = ariveLink.data?.url;
    if (url !== undefined) {
      void WebBrowser.openBrowserAsync(url);
    }
  };

  const handleStart = () => {
    // Record the application locally (status tracking lives here), then hand
    // off to Arive's secure portal where the actual 1003 is completed.
    start.mutate(undefined, { onSuccess: openPortal });
  };

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
            clear-to-close. You’ll complete the application itself in our secure loan portal.
          </Text>
          <PrimaryButton
            title="Start my application"
            onPress={handleStart}
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
          {latest.status === 'DRAFT' ? (
            <View style={styles.portalCard}>
              <Text style={styles.portalTitle}>Finish your application</Text>
              <Text style={styles.portalDetail}>
                Complete your loan application in our secure portal. Your progress there is saved
                as you go.
              </Text>
              <PrimaryButton
                title="Open application portal"
                onPress={openPortal}
                loading={ariveLink.isPending}
              />
            </View>
          ) : (
            <Pressable onPress={openPortal} style={styles.portalLinkRow}>
              <Text style={styles.portalLink}>Open the loan portal ↗</Text>
            </Pressable>
          )}
          <StatusTimeline status={latest.status as ApplicationStatus} />
          <DocumentsSection applicationId={latest.id} />
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
  portalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  portalTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  portalDetail: {
    ...typography.body,
    color: colors.textSecondary,
  },
  portalLinkRow: {
    alignSelf: 'flex-start',
  },
  portalLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
