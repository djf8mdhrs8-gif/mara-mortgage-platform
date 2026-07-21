import { calculateRefinance, type RefinanceResult } from '@mara/mortgage-calc';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';

function num(text: string): number {
  const cleaned = text.replace(/[$,%\s,]/g, '');
  if (cleaned === '') return 0;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : NaN;
}

function money(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

function yearsAndMonths(totalMonths: number): string {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} mo`;
  return months === 0 ? `${years} yr` : `${years} yr ${months} mo`;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  testID,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  testID?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType="decimal-pad"
        inputMode="decimal"
        testID={testID}
      />
    </View>
  );
}

function CompareRow({
  label,
  current,
  next,
}: {
  label: string;
  current: string;
  next: string;
}) {
  return (
    <View style={styles.compareRow}>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={styles.compareValue}>{current}</Text>
      <Text style={styles.compareValue}>{next}</Text>
    </View>
  );
}

export default function RefinanceScreen() {
  const [balance, setBalance] = useState('250000');
  const [currentRate, setCurrentRate] = useState('7.5');
  const [remainingMonths, setRemainingMonths] = useState('300');
  const [newRate, setNewRate] = useState('6.25');
  const [newYears, setNewYears] = useState('30');
  const [closing, setClosing] = useState('6000');
  const [financed, setFinanced] = useState(false);

  const result: RefinanceResult | null = useMemo(() => {
    try {
      return calculateRefinance({
        currentBalance: num(balance),
        currentRatePct: num(currentRate),
        currentRemainingMonths: Math.round(num(remainingMonths)),
        newRatePct: num(newRate),
        newTermMonths: Math.round(num(newYears) * 12),
        closingCosts: num(closing),
        financeClosingCosts: financed,
      });
    } catch {
      return null;
    }
  }, [balance, currentRate, remainingMonths, newRate, newYears, closing, financed]);

  const saves = result !== null && result.monthlySavings > 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Current loan</Text>
        <Field label="Remaining balance" value={balance} onChange={setBalance} placeholder="250000" testID="refi-balance" />
        <View style={styles.pairRow}>
          <View style={styles.flex}>
            <Field label="Rate (%)" value={currentRate} onChange={setCurrentRate} placeholder="7.5" testID="refi-current-rate" />
          </View>
          <View style={styles.flex}>
            <Field label="Months remaining" value={remainingMonths} onChange={setRemainingMonths} placeholder="300" testID="refi-remaining" />
          </View>
        </View>

        <Text style={styles.section}>New loan</Text>
        <View style={styles.pairRow}>
          <View style={styles.flex}>
            <Field label="Rate (%)" value={newRate} onChange={setNewRate} placeholder="6.25" testID="refi-new-rate" />
          </View>
          <View style={styles.flex}>
            <Field label="Term (years)" value={newYears} onChange={setNewYears} placeholder="30" testID="refi-new-years" />
          </View>
        </View>
        <Field label="Closing costs" value={closing} onChange={setClosing} placeholder="6000" testID="refi-closing" />
        <View style={styles.toggleRow}>
          <Text style={styles.fieldLabel}>Closing costs paid</Text>
          <View style={styles.toggle}>
            {([false, true] as const).map((mode) => (
              <Pressable
                key={String(mode)}
                onPress={() => setFinanced(mode)}
                style={[styles.toggleButton, financed === mode && styles.toggleActive]}
                testID={mode ? 'refi-financed' : 'refi-cash'}
              >
                <Text style={[styles.toggleText, financed === mode && styles.toggleTextActive]}>
                  {mode ? 'Financed' : 'Cash'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.results} testID="refi-results">
          {result === null ? (
            <Text style={styles.mutedText}>
              Enter your current loan and the new loan terms to compare.
            </Text>
          ) : (
            <>
              <View style={styles.compareRow}>
                <Text style={styles.compareLabel} />
                <Text style={styles.compareHeading}>Current</Text>
                <Text style={styles.compareHeading}>New</Text>
              </View>
              <CompareRow
                label="Payment (P&I)"
                current={money(result.currentPayment)}
                next={money(result.newPayment)}
              />
              <CompareRow
                label="Interest left"
                current={money(result.currentTotalRemainingInterest)}
                next={money(result.newTotalInterest)}
              />
              <CompareRow
                label="Total cost"
                current={money(result.currentTotalRemainingCost)}
                next={money(result.newTotalCost)}
              />
              <View style={styles.divider} />

              <Text style={[styles.bigLine, { color: saves ? colors.success : colors.error }]} testID="refi-monthly">
                {saves
                  ? `Save ${money(result.monthlySavings)}/month`
                  : `Payment increases ${money(Math.abs(result.monthlySavings))}/month`}
              </Text>
              <Text style={styles.detailLine} testID="refi-breakeven">
                {result.breakEvenMonths === null
                  ? 'No monthly-savings break-even (payment goes up)'
                  : result.breakEvenMonths === 0
                    ? 'Break-even: immediate (no closing costs)'
                    : `Break-even on closing costs: ${result.breakEvenMonths} months (${yearsAndMonths(result.breakEvenMonths)})`}
              </Text>
              <Text style={styles.detailLine} testID="refi-lifetime">
                Lifetime {result.lifetimeSavings >= 0 ? 'savings' : 'added cost'}:{' '}
                {money(Math.abs(result.lifetimeSavings))} · Interest{' '}
                {result.interestSavings >= 0 ? 'saved' : 'added'}:{' '}
                {money(Math.abs(result.interestSavings))}
              </Text>
              {result.lifetimeSavings < 0 && saves ? (
                <Text style={styles.warnLine}>
                  Lower payment, but restarting the term costs more overall — consider a shorter
                  new term.
                </Text>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  section: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  field: { gap: spacing.xs },
  fieldLabel: {
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
  pairRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: colors.textOnPrimary,
  },
  results: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compareLabel: {
    flex: 1.2,
    ...typography.caption,
    color: colors.textSecondary,
  },
  compareHeading: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  compareValue: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  bigLine: {
    ...typography.heading,
    fontSize: 18,
  },
  detailLine: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  warnLine: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  mutedText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
