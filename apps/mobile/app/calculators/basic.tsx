import { calculateBasicMortgage, type BasicMortgageResult } from '@mara/mortgage-calc';
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

/** Parses user-typed currency/number text; '' → 0 for optional fields. */
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

interface FieldProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  testID?: string;
}

function Field({ label, value, onChange, placeholder, testID }: FieldProps) {
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

export default function BasicCalculatorScreen() {
  const [price, setPrice] = useState('250000');
  const [down, setDown] = useState('20');
  const [downMode, setDownMode] = useState<'percent' | 'amount'>('percent');
  const [rate, setRate] = useState('6.5');
  const [years, setYears] = useState('30');
  const [taxAnnual, setTaxAnnual] = useState('');
  const [insAnnual, setInsAnnual] = useState('');
  const [hoa, setHoa] = useState('');
  const [pmiPct, setPmiPct] = useState('');
  const [closing, setClosing] = useState('');

  const result: BasicMortgageResult | null = useMemo(() => {
    const termMonths = Math.round(num(years) * 12);
    try {
      return calculateBasicMortgage({
        purchasePrice: num(price),
        downPayment: { type: downMode, value: num(down) },
        annualRatePct: num(rate),
        termMonths,
        propertyTaxAnnual: num(taxAnnual),
        homeInsuranceAnnual: num(insAnnual),
        hoaMonthly: num(hoa),
        pmiAnnualPct: num(pmiPct),
        closingCosts: num(closing),
      });
    } catch {
      return null; // incomplete/invalid input — show placeholder results
    }
  }, [price, down, downMode, rate, years, taxAnnual, insAnnual, hoa, pmiPct, closing]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Home</Text>
        <Field label="Purchase price" value={price} onChange={setPrice} placeholder="250000" testID="calc-price" />
        <View style={styles.downRow}>
          <View style={styles.flex}>
            <Field
              label={downMode === 'percent' ? 'Down payment (%)' : 'Down payment ($)'}
              value={down}
              onChange={setDown}
              placeholder={downMode === 'percent' ? '20' : '50000'}
              testID="calc-down"
            />
          </View>
          <View style={styles.toggle}>
            {(['percent', 'amount'] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setDownMode(mode)}
                style={[styles.toggleButton, downMode === mode && styles.toggleActive]}
                testID={`calc-down-${mode}`}
              >
                <Text
                  style={[styles.toggleText, downMode === mode && styles.toggleTextActive]}
                >
                  {mode === 'percent' ? '%' : '$'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.section}>Loan</Text>
        <View style={styles.pairRow}>
          <View style={styles.flex}>
            <Field label="Interest rate (%)" value={rate} onChange={setRate} placeholder="6.5" testID="calc-rate" />
          </View>
          <View style={styles.flex}>
            <Field label="Term (years)" value={years} onChange={setYears} placeholder="30" testID="calc-years" />
          </View>
        </View>

        <Text style={styles.section}>Monthly costs</Text>
        <View style={styles.pairRow}>
          <View style={styles.flex}>
            <Field label="Property tax (/yr)" value={taxAnnual} onChange={setTaxAnnual} placeholder="0" testID="calc-tax" />
          </View>
          <View style={styles.flex}>
            <Field label="Insurance (/yr)" value={insAnnual} onChange={setInsAnnual} placeholder="0" testID="calc-ins" />
          </View>
        </View>
        <View style={styles.pairRow}>
          <View style={styles.flex}>
            <Field label="HOA (/mo)" value={hoa} onChange={setHoa} placeholder="0" testID="calc-hoa" />
          </View>
          <View style={styles.flex}>
            <Field label="PMI (%/yr of loan)" value={pmiPct} onChange={setPmiPct} placeholder="0.5" testID="calc-pmi" />
          </View>
        </View>

        <Text style={styles.section}>Closing</Text>
        <Field label="Closing costs (optional)" value={closing} onChange={setClosing} placeholder="0" testID="calc-closing" />

        <View style={styles.results} testID="calc-results">
          {result === null ? (
            <Text style={styles.mutedText}>Enter price, rate, and term to see results.</Text>
          ) : (
            <>
              <ResultRow label="Loan amount" value={money(result.loanAmount)} />
              <ResultRow label={`Down payment (LTV ${result.ltvPct}%)`} value={money(result.downPaymentAmount)} />
              <View style={styles.divider} />
              <ResultRow label="Principal & interest" value={money(result.monthlyPrincipalInterest)} />
              <ResultRow label="Property tax" value={money(result.monthlyPropertyTax)} muted />
              <ResultRow label="Insurance" value={money(result.monthlyInsurance)} muted />
              <ResultRow label="HOA" value={money(result.monthlyHoa)} muted />
              <ResultRow label="PMI" value={money(result.monthlyPmi)} muted />
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total monthly</Text>
                <Text style={styles.totalValue} testID="calc-total">
                  {money(result.totalMonthly)}
                </Text>
              </View>
              <ResultRow label="Cash needed to close" value={money(result.cashToClose)} />
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
  downRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  pairRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 1,
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    ...typography.body,
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
  mutedText: {
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
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
});
