import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';

export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PROCESSING'
  | 'UNDERWRITING'
  | 'CONDITIONALLY_APPROVED'
  | 'CLEAR_TO_CLOSE'
  | 'CLOSED'
  | 'CANCELLED';

const STEPS: { status: ApplicationStatus; title: string; detail: string }[] = [
  { status: 'DRAFT', title: 'Application started', detail: 'Your application has been created.' },
  { status: 'SUBMITTED', title: 'Submitted', detail: 'Your application is in — we’re on it.' },
  { status: 'PROCESSING', title: 'Processing', detail: 'Documents are being collected and verified.' },
  { status: 'UNDERWRITING', title: 'Underwriting', detail: 'An underwriter is reviewing your file.' },
  { status: 'CONDITIONALLY_APPROVED', title: 'Conditionally approved', detail: 'Approved pending a few final items.' },
  { status: 'CLEAR_TO_CLOSE', title: 'Clear to close', detail: 'All conditions met — closing is being scheduled.' },
  { status: 'CLOSED', title: 'Closed', detail: 'Congratulations — your loan has funded!' },
];

export function StatusTimeline({ status }: { status: ApplicationStatus }) {
  if (status === 'CANCELLED') {
    return (
      <View style={styles.cancelled}>
        <Text style={styles.cancelledTitle}>Application cancelled</Text>
        <Text style={styles.cancelledDetail}>
          Reach out any time if you’d like to restart — we’ll pick up right where you left off.
        </Text>
      </View>
    );
  }

  const currentIndex = STEPS.findIndex((step) => step.status === status);

  return (
    <View style={styles.timeline}>
      {STEPS.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        return (
          <View key={step.status} style={styles.step}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  current && styles.dotCurrent,
                ]}
              >
                {done ? <Text style={styles.check}>✓</Text> : null}
              </View>
              {index < STEPS.length - 1 ? (
                <View style={[styles.connector, done && styles.connectorDone]} />
              ) : null}
            </View>
            <View style={styles.stepBody}>
              <Text
                style={[
                  styles.stepTitle,
                  current && styles.stepTitleCurrent,
                  !done && !current && styles.stepMuted,
                ]}
              >
                {step.title}
              </Text>
              {current ? <Text style={styles.stepDetail}>{step.detail}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 22;

const styles = StyleSheet.create({
  timeline: {
    gap: 0,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    alignItems: 'center',
    width: DOT,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  dotCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  check: {
    color: colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 18,
    backgroundColor: colors.border,
  },
  connectorDone: {
    backgroundColor: colors.success,
  },
  stepBody: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  stepTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  stepTitleCurrent: {
    color: colors.primary,
  },
  stepMuted: {
    color: colors.textSecondary,
    fontWeight: '400',
  },
  stepDetail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cancelled: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cancelledTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.error,
  },
  cancelledDetail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
