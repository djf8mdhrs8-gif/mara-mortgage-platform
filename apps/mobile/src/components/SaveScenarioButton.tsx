import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSaveScenario, type ScenarioType } from '@/features/scenarios/useScenarios';
import { colors, radii, spacing, typography } from '@/theme/tokens';

/**
 * "Save scenario" affordance shared by every calculator screen. Collapsed
 * it's a single button; expanded it asks for a name, then persists via the
 * API (which recomputes results server-side).
 *
 * `getInputs` returns the current engine inputs, or null while the form is
 * incomplete — the button disables itself on null.
 */
export function SaveScenarioButton({
  type,
  defaultName,
  getInputs,
}: {
  type: ScenarioType;
  defaultName: string;
  getInputs: () => Record<string, unknown> | null;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const save = useSaveScenario();

  const inputs = getInputs();
  const disabled = inputs === null;

  if (!open) {
    return (
      <View style={styles.wrap}>
        {save.isSuccess ? (
          <Text style={styles.savedText} testID="scenario-saved">
            Saved ✓ — find it under Saved scenarios
          </Text>
        ) : null}
        <Pressable
          onPress={() => {
            save.reset();
            setOpen(true);
          }}
          disabled={disabled}
          style={[styles.button, disabled && styles.buttonDisabled]}
          testID="scenario-save-open"
        >
          <Text style={styles.buttonText}>Save scenario</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Name this scenario"
        placeholderTextColor={colors.textSecondary}
        maxLength={80}
        testID="scenario-name"
      />
      <View style={styles.row}>
        <Pressable
          onPress={() => setOpen(false)}
          style={[styles.button, styles.buttonGhost]}
          testID="scenario-cancel"
        >
          <Text style={[styles.buttonText, styles.buttonGhostText]}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            const current = getInputs();
            if (current === null || name.trim() === '') return;
            save.mutate(
              { type, name: name.trim(), inputs: current },
              { onSuccess: () => setOpen(false) },
            );
          }}
          disabled={save.isPending || name.trim() === ''}
          style={[styles.button, (save.isPending || name.trim() === '') && styles.buttonDisabled]}
          testID="scenario-confirm"
        >
          <Text style={styles.buttonText}>{save.isPending ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>
      {save.isError ? (
        <Text style={styles.errorText}>Couldn&rsquo;t save — check your connection and try again.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGhost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  buttonGhostText: {
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  savedText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    textAlign: 'right',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'right',
  },
});
