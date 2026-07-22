import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { useLoanProgram } from '@/features/learn/useLoanPrograms';
import { colors, spacing, typography } from '@/theme/tokens';

export default function LoanProgramScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, isPending, isError } = useLoanProgram(typeof slug === 'string' ? slug : undefined);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: data?.title ?? 'Loan Program' }} />
      {isPending ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : isError || data === undefined ? (
        <Text style={styles.error}>This program isn’t available right now.</Text>
      ) : (
        <>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.summary}>{data.summary}</Text>
          {data.content.split('\n\n').map((paragraph, index) => (
            <Text key={index} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
          <Link href="/contact" style={styles.cta}>
            Have questions? Talk to us →
          </Link>
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
  title: {
    ...typography.title,
    fontSize: 26,
    color: colors.textPrimary,
  },
  summary: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  paragraph: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
  },
  error: {
    ...typography.body,
    color: colors.error,
  },
  cta: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
});
