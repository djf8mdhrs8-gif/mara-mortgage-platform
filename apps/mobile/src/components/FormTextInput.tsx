import { type Control, type FieldValues, type Path, useController } from 'react-hook-form';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';

interface FormTextInputProps<T extends FieldValues> extends TextInputProps {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

export function FormTextInput<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: FormTextInputProps<T>) {
  const {
    field: { value, onChange, onBlur },
    fieldState: { error },
  } = useController({ control, name });

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error !== undefined && styles.inputError]}
        value={typeof value === 'string' ? value : ''}
        onChangeText={onChange}
        onBlur={onBlur}
        placeholderTextColor={colors.textSecondary}
        {...inputProps}
      />
      {error?.message !== undefined ? <Text style={styles.error}>{error.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
});
