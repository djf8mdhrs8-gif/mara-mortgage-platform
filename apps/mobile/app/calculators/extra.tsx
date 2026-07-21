import { buildExtraPaymentPlan, type ExtraPaymentResult } from '@mara/mortgage-calc';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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

function payoffDate(monthsFromNow: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsFromNow);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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

export default function ExtraPaymentScreen() {
  const [principal, setPrincipal] = useState('200000');
  const [rate, setRate] = useState('6.5');
  const [years, setYears] = useState('30');
  const [extraMonthly, setExtraMonthly] = useState('');
  const [extraAnnual, setExtraAnnual] = useState('');
  const [oneTimeAmount, setOneTimeAmount] = useState('');
  const [oneTimeMonth, setOneTimeMonth] = useState('');

  const result: ExtraPaymentResult | null = useMemo(() => {
    try {
      const oneAmt = num(oneTimeAmount);
      const oneMonth = Math.round(num(oneTimeMonth));
      return buildExtraPaymentPlan({
        principal: num(principal),
        annualRatePct: num(rate),
        termMonths: Math.round(num(years) * 12),
        extraMonthly: num(extraMonthly),
        extraAnnual: num(extraAnnual),
        oneTime: oneAmt > 0 && oneMonth > 0 ? { amount: oneAmt, month: oneMonth } : undefined,
      });
    } catch {
      return null;
    }
  }, [principal, rate, years, extraMonthly, extraAnnual, oneTimeAmount, oneTimeMonth]);

  const hasExtras =
    result !== null && (result.monthsSaved > 0 || result.interestSaved > 0);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Loan</Text>
        <Field label="Loan amount" value={principal} onChange={setPrincipal} placeholder="200000" testID="extra-principal" />
        <View style={styles.pairRow}>
          <View style={styles.flex}>
            <Field label="Interest rate (%)" value={rate} onChange={setRate} placeholder="6.5" testID="extra-rate" />
          </View>
          <View style={styles.flex}>
            <Field label="Term (years)" value={years} onChange={setYears} placeholder="30" testID="extra-years" />
          </View>
        </View>

        <Text style={styles.section}>Extra payments</Text>
        <Field
          label="Extra monthly payment"
          value={extraMonthly}
          onChange={setExtraMonthly}
          placeholder="200"
          testID="extra-monthly"
        />
        <Field
          label="Annual lump sum (every 12th payment)"
          value={extraAnnual}
          onChange={setExtraAnnual}
          placeholder="1000"
          testID="extra-annual"
        />
        <View style={styles.pairRow}>
          <View style={styles.flex}>
            <Field
              label="One-time payment"
              value={oneTimeAmount}
              onChange={setOneTimeAmount}
              placeholder="10000"
              testID="extra-onetime"
            />
          </View>
          <View style={styles.flex}>
            <Field
              label="...at payment #"
              value={oneTimeMonth}
              onChange={setOneTimeMonth}
              placeholder="24"
              testID="extra-onetime-month"
            />
          </View>
        </View>

        <View style={styles.results} testID="extra-results">
          {result === null ? (
            <Text style={styles.mutedText}>Enter loan amount, rate, and term to see results.</Text>
          ) : (
            <>
              <View style={styles.compareRow}>
                <View style={styles.compareCol}>
                  <Text style={styles.compareHeading}>Original</Text>
                  <Text style={styles.compareBig}>{yearsAndMonths(result.baseline.payoffMonths)}</Text>
                  <Text style={styles.compareDetail}>
                    interest {money(result.baseline.totalInterest)}
                  </Text>
                </View>
                <View style={styles.compareCol}>
                  <Text style={styles.compareHeading}>With extras</Text>
                  <Text style={[styles.compareBig, hasExtras && styles.accent]}>
                    {yearsAndMonths(result.payoffMonths)}
                  </Text>
                  <Text style={styles.compareDetail}>interest {money(result.totalInterest)}</Text>
                </View>
              </View>

              {hasExtras ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.savingsBox} testID="extra-savings">
                    <Text style={styles.savingsLine}>
                      Time saved: {yearsAndMonths(result.monthsSaved)}
                    </Text>
                    <Text style={styles.savingsLine}>
                      Interest saved: {money(result.interestSaved)}
                    </Text>
                    <Text style={styles.savingsDetail}>
                      New payoff date: {payoffDate(result.payoffMonths)}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.mutedText}>Add an extra payment above to see savings.</Text>
              )}

              <Link
                href={{
                  pathname: '/calculators/amortization',
                  params: {
                    principal,
                    rate,
                    term: String(Math.round(num(years) * 12)),
                    extraMonthly: extraMonthly || undefined,
                    extraAnnual: extraAnnual || undefined,
                    oneTimeAmount: oneTimeAmount || undefined,
                    oneTimeMonth: oneTimeMonth || undefined,
                  },
                }}
                style={styles.scheduleLink}
                testID="extra-schedule-link"
              >
                View updated amortization schedule →
              </Link>
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
  results: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  compareRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  compareCol: {
    flex: 1,
    gap: 2,
  },
  compareHeading: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  compareBig: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  compareDetail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  accent: {
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  savingsBox: {
    gap: 2,
  },
  savingsLine: {
    ...typography.body,
    color: colors.success,
    fontWeight: '700',
  },
  savingsDetail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  mutedText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  scheduleLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
