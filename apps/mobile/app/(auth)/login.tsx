import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import logo from '../../assets/branding/mara-logo.png';
import { useLogin } from '@/features/auth/useAuth';
import { useContentBlock } from '@/features/content/useContentBlock';
import { FormTextInput } from '@/components/FormTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, spacing, typography } from '@/theme/tokens';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const login = useLogin();
  const compliance = useContentBlock(
    'compliance.footer',
    'Mara — NMLS #1925279 · Certified Home Loans NMLS #1806779 · Equal Housing Lender',
  );
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => login.mutate(values));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brandBanner}>
        <Image
          source={logo}
          style={styles.brandLogo}
          resizeMode="contain"
          accessibilityLabel="Mara Mortgage Solutions"
        />
      </View>
      <View style={styles.form}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue your mortgage journey.</Text>

        <FormTextInput
          control={control}
          name="email"
          label="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          testID="login-email"
        />
        <FormTextInput
          control={control}
          name="password"
          label="Password"
          secureTextEntry
          autoComplete="current-password"
          testID="login-password"
        />

        {login.isError ? <Text style={styles.error}>{login.error.message}</Text> : null}

        <PrimaryButton title="Sign in" onPress={onSubmit} loading={login.isPending} />

        <Text style={styles.footer}>
          New here?{' '}
          <Link href="/register" style={styles.link}>
            Create an account
          </Link>
        </Text>

        <Text style={styles.compliance} testID="login-compliance">
          {compliance.body}
        </Text>

        <Text style={styles.legalLinks}>
          <Link href="/privacy" style={styles.link} testID="login-privacy">
            Privacy Policy
          </Link>
          {'   ·   '}
          <Link href="/legal" style={styles.link} testID="login-legal">
            Licensing & Disclosures
          </Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  brandBanner: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  brandLogo: {
    width: 210,
    height: 168,
  },
  form: {
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
  footer: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
  },
  compliance: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  legalLinks: {
    ...typography.caption,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
