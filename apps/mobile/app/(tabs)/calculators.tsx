import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';

const CALCULATORS = [
  {
    href: '/calculators/basic',
    title: 'Mortgage Payment',
    description: 'Monthly payment, cash to close, and full cost breakdown',
    ready: true,
  },
  { href: null, title: 'Extra Payments', description: 'Coming in Milestone 16', ready: false },
  { href: null, title: 'Refinance', description: 'Coming in Milestone 17', ready: false },
  { href: null, title: 'Affordability', description: 'Coming in Milestone 18', ready: false },
] as const;

export default function CalculatorsScreen() {
  return (
    <View style={styles.container}>
      {CALCULATORS.map((calc) =>
        calc.ready ? (
          <Link key={calc.title} href={calc.href} asChild>
            <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
              <Text style={styles.cardTitle}>{calc.title}</Text>
              <Text style={styles.cardDescription}>{calc.description}</Text>
            </Pressable>
          </Link>
        ) : (
          <View key={calc.title} style={[styles.card, styles.cardDisabled]}>
            <Text style={styles.cardTitle}>{calc.title}</Text>
            <Text style={styles.cardDescription}>{calc.description}</Text>
          </View>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardPressed: {
    backgroundColor: colors.border,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardTitle: {
    ...typography.heading,
    fontSize: 17,
    color: colors.textPrimary,
  },
  cardDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
