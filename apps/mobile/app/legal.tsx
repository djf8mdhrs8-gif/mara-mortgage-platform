import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { useContentBlock } from '@/features/content/useContentBlock';
import { colors, spacing, typography } from '@/theme/tokens';

const FALLBACK = [
  'Certified Home Loans · Company NMLS #1806779. Verify our licensing at nmlsconsumeraccess.org.',
  'Equal Housing Lender. We do business in accordance with the Federal Fair Housing Act and the Equal Credit Opportunity Act.',
  'All calculations in this app are estimates for planning purposes only and are not a loan offer, rate quote, or commitment to lend.',
].join('\n\n');

export default function LegalScreen() {
  const disclosures = useContentBlock('compliance.disclosures', FALLBACK);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          title: 'Licensing & Disclosures',
          headerShown: true,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.textOnPrimary,
        }}
      />
      <Text style={styles.title}>Licensing & Disclosures</Text>
      {disclosures.body.split('\n\n').map((paragraph, index) => (
        <Text key={index} style={styles.paragraph}>
          {paragraph}
        </Text>
      ))}
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
    ...typography.heading,
    color: colors.textPrimary,
  },
  paragraph: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
