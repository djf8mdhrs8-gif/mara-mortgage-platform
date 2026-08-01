import { calculateBasicMortgage } from '@mara/mortgage-calc';
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

import { SaveScenarioButton } from '@/components/SaveScenarioButton';
import { calculatorDefaults } from '@/features/config/useCalculatorConfig';
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

/**
 * Quick Quote — the three-field realtor mode: price, down, rate. Big
 * answer, minimal typing, built for quoting a payment mid-conversation.
 */
export default function QuickQuoteScreen() {
  // Admin-tunable assumptions, captured once per mount (taxes/insurance
  // estimates and the prefilled rate — see the admin Calculators page).
  const [d] = useState(calculatorDefaults);
  const [price, setPrice] = useState('400000');
  const [downPct, setDownPct] = useState('20');
  const [rate, setRate] = useState(String(d.defaultRatePct));
  const [termYears, setTermYears] = useState<15 | 30>(30);

  const engineInputs = useMemo(
    () => ({
      purchasePrice: num(price),
      downPayment: { type: 'percent' as const, value: num(downPct) },
      annualRatePct: num(rate),
      termMonths: termYears * 12,
      propertyTaxAnnual: (num(price) * d.propertyTaxAnnualPct) / 100,
      homeInsuranceAnnual: d.homeInsuranceAnnual,
    }),
    [price, downPct, rate, termYears, d],
  );

  const result = useMemo(() => {
    try {
      return calculateBasicMortgage(engineInputs);
    } catch {
      return null;
    }
  }, [engineInputs]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.fieldsRow}>
          <View style={styles.flex}>
            <Text style={styles.fieldLabel}>Price</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="400000"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              inputMode="decimal"
              testID="quick-price"
            />
          </View>
          <View style={styles.narrow}>
            <Text style={styles.fieldLabel}>Down %</Text>
            <TextInput
              style={styles.input}
              value={downPct}
              onChangeText={setDownPct}
              placeholder="20"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              inputMode="decimal"
              testID="quick-down"
            />
          </View>
          <View style={styles.narrow}>
            <Text style={styles.fieldLabel}>Rate %</Text>
            <TextInput
              style={styles.input}
              value={rate}
              onChangeText={setRate}
              placeholder="6.5"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              inputMode="decimal"
              testID="quick-rate"
            />
          </View>
        </View>

        <View style={styles.termRow}>
          {([30, 15] as const).map((years) => (
            <Pressable
              key={years}
              onPress={() => setTermYears(years)}
              style={[styles.termButton, termYears === years && styles.termActive]}
              testID={`quick-term-${years}`}
            >
              <Text style={[styles.termText, termYears === years && styles.termTextActive]}>
                {years}-year
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.hero} testID="quick-result">
          {result === null ? (
            <Text style={styles.mutedText}>Enter a price, down payment, and rate.</Text>
          ) : (
            <>
              <Text style={styles.heroLabel}>Estimated monthly payment</Text>
              <Text style={styles.heroNumber} testID="quick-total">
                {money(result.totalMonthly, false)}
              </Text>
              <Text style={styles.heroDetail}>
                P&I {money(result.monthlyPrincipalInterest)} · taxes {money(result.monthlyPropertyTax)} ·
                insurance {money(result.monthlyInsurance)}
              </Text>
              <Text style={styles.heroDetail}>
                {money(result.downPaymentAmount, false)} down · loan {money(result.loanAmount, false)}
              </Text>
            </>
          )}
        </View>

        <SaveScenarioButton
          type="BASIC"
          defaultName="Quick quote"
          getInputs={() => (result === null ? null : engineInputs)}
        />

        <Text style={styles.footnote}>
          Taxes estimated at {d.propertyTaxAnnualPct}% of price and insurance at{' '}
          {money(d.homeInsuranceAnnual, false)}/yr —
          fine for a conversation, adjustable in the full Mortgage Payment calculator. Estimates only,
          not a loan offer.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  narrow: { width: 86 },
  container: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    fontSize: 18,
    color: colors.textPrimary,
  },
  termRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  termButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  termActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  termTextActive: {
    color: colors.textOnPrimary,
  },
  hero: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroNumber: {
    fontSize: 44,
    fontWeight: '700',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  heroDetail: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footnote: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  mutedText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
