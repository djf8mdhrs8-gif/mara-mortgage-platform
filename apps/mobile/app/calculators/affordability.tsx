import { calculateAffordability, type AffordabilityResult } from '@mara/mortgage-calc';
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

function money(value: number, cents = true): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
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

function ResultRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.resultRow}>
      <Text style={[styles.resultLabel, muted && styles.mutedText]}>{label}</Text>
      <Text style={[styles.resultValue, muted && styles.mutedText]}>{value}</Text>
    </View>
  );
}

export default function AffordabilityScreen() {
  const [income, setIncome] = useState('96000');
  const [debts, setDebts] = useState('500');
  const [down, setDown] = useState('40000');
  const [rate, setRate] = useState('6.5');
  const [years, setYears] = useState('30');
  const [taxPct, setTaxPct] = useState('1.2');
  const [insAnnual, setInsAnnual] = useState('1500');
  const [hoa, setHoa] = useState('');

  const result: AffordabilityResult | null = useMemo(() => {
    try {
      return calculateAffordability({
        annualIncome: num(income),
        monthlyDebts: num(debts),
        downPayment: num(down),
        annualRatePct: num(rate),
        termMonths: Math.round(num(years) * 12),
        propertyTaxAnnualPct: num(taxPct),
        homeInsuranceAnnual: num(insAnnual),
        hoaMonthly: num(hoa),
      });
    } catch {
      return null;
    }
  }, [income, debts, down, rate, years, taxPct, insAnnual, hoa]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Income & debts</Text>
        <View style={styles.pairRow}>
          <View style={styles.flex}>
            <Field label="Annual income (gross)" value={income} onChange={setIncome} placeholder="96000" testID="afford-income" />
          </View>
          <View style={styles.flex}>
            <Field label="Monthly debts" value={debts} onChange={setDebts} placeholder="500" testID="afford-debts" />
          </View>
        </View>

        <Text style={styles.section}>Loan</Text>
        <Field label="Down payment" value={down} onChange={setDown} placeholder="40000" testID="afford-down" />
        <View style={styles.pairRow}>
          <View style={styles.flex}>
            <Field label="Interest rate (%)" value={rate} onChange={setRate} placeholder="6.5" testID="afford-rate" />
          </View>
          <View style={styles.flex}>
            <Field label="Term (years)" value={years} onChange={setYears} placeholder="30" testID="afford-years" />
          </View>
        </View>

        <Text style={styles.section}>Housing costs</Text>
        <View style={styles.pairRow}>
          <View style={styles.flex}>
            <Field label="Property tax (%/yr of price)" value={taxPct} onChange={setTaxPct} placeholder="1.1" testID="afford-tax" />
          </View>
          <View style={styles.flex}>
            <Field label="Insurance ($/yr)" value={insAnnual} onChange={setInsAnnual} placeholder="1500" testID="afford-ins" />
          </View>
        </View>
        <Field label="HOA ($/mo)" value={hoa} onChange={setHoa} placeholder="0" testID="afford-hoa" />

        <View style={styles.results} testID="afford-results">
          {result === null ? (
            <Text style={styles.mutedText}>
              Enter your income and loan details — or your debts may be too high for a housing
              payment at these settings.
            </Text>
          ) : (
            <>
              <Text style={styles.priceLabel}>You can afford up to</Text>
              <Text style={styles.price} testID="afford-price">
                {money(result.maxHomePrice, false)}
              </Text>
              <Text style={styles.limitNote}>
                Limited by the {result.limitedBy === 'front-end' ? '28% housing' : '36% total-debt'}{' '}
                ratio ({result.limitedBy})
              </Text>
              <View style={styles.divider} />
              <ResultRow label="Loan amount" value={money(result.loanAmount, false)} />
              <ResultRow label="Principal & interest" value={money(result.monthlyPrincipalInterest)} />
              <ResultRow label="Property tax" value={money(result.monthlyPropertyTax)} muted />
              <ResultRow label="Insurance" value={money(result.monthlyInsurance)} muted />
              <ResultRow label="HOA" value={money(result.monthlyHoa)} muted />
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Est. monthly payment</Text>
                <Text style={styles.totalValue} testID="afford-total">
                  {money(result.totalMonthly)}
                </Text>
              </View>
              <Text style={styles.capsNote}>
                Budgets: housing cap {money(result.frontEndCap)}/mo · total-debt cap{' '}
                {money(result.backEndCap)}/mo (28/36 rule)
              </Text>
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
    gap: spacing.xs,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
  },
  price: {
    ...typography.title,
    fontSize: 34,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  limitNote: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  resultValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...typography.heading,
    fontSize: 18,
    color: colors.textPrimary,
  },
  totalValue: {
    ...typography.heading,
    fontSize: 22,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  capsNote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  mutedText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
