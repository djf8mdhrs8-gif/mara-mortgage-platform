import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { z } from 'zod';

import { useRegister } from '@/features/auth/useAuth';
import { FormTextInput } from '@/components/FormTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, spacing, typography } from '@/theme/tokens';

const schema = z.object({
  firstName: z.string().min(1, 'Enter your first name'),
  lastName: z.string().min(1, 'Enter your last name'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const register = useRegister();
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => register.mutate(values));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Save calculations, track your application, and stay in the loop.
        </Text>

        <FormTextInput control={control} name="firstName" label="First name" testID="reg-first" />
        <FormTextInput control={control} name="lastName" label="Last name" testID="reg-last" />
        <FormTextInput
          control={control}
          name="email"
          label="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          testID="reg-email"
        />
        <FormTextInput
          control={control}
          name="password"
          label="Password"
          secureTextEntry
          autoComplete="new-password"
          testID="reg-password"
        />

        {register.isError ? <Text style={styles.error}>{register.error.message}</Text> : null}

        <PrimaryButton title="Create account" onPress={onSubmit} loading={register.isPending} />

        <Text style={styles.footer}>
          Already have an account?{' '}
          <Link href="/login" style={styles.link}>
            Sign in
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  form: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
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
});
