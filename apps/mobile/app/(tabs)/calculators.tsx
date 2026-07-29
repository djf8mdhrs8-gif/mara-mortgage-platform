import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';

const CALCULATORS = [
  {
    href: '/calculators/basic',
    title: 'Mortgage Payment',
    description: 'Monthly payment, cash to close, and full cost breakdown',
    ready: true,
  },
  {
    href: '/calculators/extra',
    title: 'Extra Payments',
    description: 'See how extra payments cut years and interest off your loan',
    ready: true,
  },
  {
    href: '/calculators/refinance',
    title: 'Refinance',
    description: 'Compare your current loan to a new one — savings and break-even',
    ready: true,
  },
  {
    href: '/calculators/affordability',
    title: 'Affordability',
    description: 'How much home your income and debts support (28/36 rule)',
    ready: true,
  },
  {
    href: '/calculators/rent-vs-buy',
    title: 'Rent vs. Buy',
    description: 'Project your wealth over time on each path — with break-even year',
    ready: true,
  },
  {
    href: '/calculators/buydown',
    title: 'Rate Buydown',
    description: '2-1 and 3-2-1 temporary buydowns, or permanent discount points',
    ready: true,
  },
  {
    href: '/calculators/property',
    title: 'Property Analysis',
    description: 'Any address + its real costs — payment and cash across down-payment options',
    ready: true,
  },
] as const;

export default function CalculatorsScreen() {
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <Link href="/calculators/saved" asChild>
        <Pressable
          style={({ pressed }) => [styles.card, styles.savedCard, pressed && styles.cardPressed]}
          testID="saved-scenarios-link"
        >
          <Text style={[styles.cardTitle, styles.savedCardTitle]}>Saved scenarios</Text>
          <Text style={[styles.cardDescription, styles.savedCardDescription]}>
            Your saved calculator runs — compare any two side by side
          </Text>
        </Pressable>
      </Link>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
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
  savedCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  savedCardTitle: {
    color: colors.textOnPrimary,
  },
  savedCardDescription: {
    color: '#B9C8D8',
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
