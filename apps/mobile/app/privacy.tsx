import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { useContentBlock } from '@/features/content/useContentBlock';
import { colors, spacing, typography } from '@/theme/tokens';

// Mirrors the seeded `legal.privacy` block so the policy still renders offline
// or before the first fetch. Admin edits win once the block is saved.
const FALLBACK = [
  'This policy explains what the Mara Mortgage Solutions app collects, why, and who it is shared with.',
  'Information you give us: your name, email address, and password when you create an account; the figures you enter into the calculators; documents you upload for your loan; and the messages you send to the loan team.',
  'Information we create: your loan status and milestones, an access record for every document (who opened it and when), and sign-in activity used to protect your account.',
  'How we use it: to run your account, produce your calculator results, deliver documents and messages to your loan team, notify you about your loan, and keep the service secure.',
  'Who we share it with: Certified Home Loans staff working on your loan, and the service providers who host the app and store your documents under contract. Choosing "Start my application" opens Arive, our loan-application provider, which handles that information under its own privacy policy. We do not sell your personal information or share it for advertising.',
  'Security: passwords are stored only as irreversible hashes, traffic is encrypted in transit, documents are access-controlled, and document access is logged.',
  'Your choices: you can request a copy of your information, ask us to correct it, or ask us to close your account and delete what we are not required to retain. Lending records are subject to legal retention requirements.',
  'Contact us about privacy at missa@certifiedhomeloans.com or (954) 612-5535.',
].join('\n\n');

export default function PrivacyScreen() {
  const privacy = useContentBlock('legal.privacy', FALLBACK);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          title: 'Privacy Policy',
          headerShown: true,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.textOnPrimary,
        }}
      />
      <Text style={styles.title}>Privacy Policy</Text>
      {privacy.body.split('\n\n').map((paragraph, index) => (
        <Text key={index} style={styles.paragraph} testID={`privacy-paragraph-${index}`}>
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
