import { Link } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/features/auth/store';
import {
  CONTACT,
  callUrl,
  emailUrl,
  preApprovalEmailUrl,
  scheduleUrl,
  smsUrl,
} from '@/config/contact';
import { colors, radii, spacing, typography } from '@/theme/tokens';

interface ActionRowProps {
  glyph: string;
  title: string;
  detail: string;
  onPress: () => void;
  testID: string;
}

function ActionRow({ glyph, title, detail, onPress, testID }: ActionRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID={testID}
    >
      <Text style={styles.glyph}>{glyph}</Text>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function ContactScreen() {
  const user = useAuthStore((s) => s.user);
  const fullName = user === null ? undefined : `${user.firstName} ${user.lastName}`;
  const open = (url: string): void => {
    Linking.openURL(url).catch(() => undefined);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Questions? Talk to {CONTACT.name}.</Text>
        <Text style={styles.headerDetail}>
          Real answers from your loan officer — no phone trees, no runaround.
        </Text>
      </View>

      <ActionRow
        glyph="☏"
        title="Call"
        detail={CONTACT.phoneDisplay}
        onPress={() => open(callUrl())}
        testID="contact-call"
      />
      <ActionRow
        glyph="✉"
        title="Text"
        detail={CONTACT.phoneDisplay}
        onPress={() => open(smsUrl())}
        testID="contact-text"
      />
      <ActionRow
        glyph="@"
        title="Email"
        detail={CONTACT.email}
        onPress={() => open(emailUrl())}
        testID="contact-email"
      />
      <ActionRow
        glyph="▦"
        title="Schedule an appointment"
        detail={CONTACT.scheduleUrl === null ? 'Suggest times by email' : 'Pick a time that works'}
        onPress={() => open(scheduleUrl(fullName))}
        testID="contact-schedule"
      />

      <View style={styles.preApproval}>
        <Text style={styles.preApprovalTitle}>Ready to get pre-approved?</Text>
        <Text style={styles.preApprovalDetail}>
          A pre-approval letter shows sellers you’re serious — and it’s free. Send over a few
          basics and {CONTACT.name} will take it from there.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => open(preApprovalEmailUrl(fullName))}
          style={({ pressed }) => [styles.preApprovalButton, pressed && styles.buttonPressed]}
          testID="contact-preapproval"
        >
          <Text style={styles.preApprovalButtonText}>Request pre-approval</Text>
        </Pressable>
      </View>

      <Text style={styles.footnote}>
        {CONTACT.company} · NMLS #1806779 · Equal Housing Lender{'\n'}
        <Link href="/legal" style={styles.legalLink} testID="contact-legal">
          Licensing & disclosures
        </Link>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  headerDetail: {
    ...typography.body,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.border,
  },
  glyph: {
    fontSize: 22,
    color: colors.primary,
    width: 28,
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...typography.body,
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
  },
  preApproval: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  preApprovalTitle: {
    ...typography.heading,
    fontSize: 18,
    color: colors.textOnPrimary,
  },
  preApprovalDetail: {
    ...typography.caption,
    color: colors.textOnPrimary,
    opacity: 0.85,
    lineHeight: 18,
  },
  preApprovalButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  preApprovalButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  footnote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 20,
  },
  legalLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});
