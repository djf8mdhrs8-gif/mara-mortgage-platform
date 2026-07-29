import { analyzeProperty, type PropertyAnalysisResult } from '@mara/mortgage-calc';
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
  keyboard = 'decimal',
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  testID?: string;
  keyboard?: 'decimal' | 'text';
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
        keyboardType={keyboard === 'decimal' ? 'decimal-pad' : 'default'}
        inputMode={keyboard === 'decimal' ? 'decimal' : 'text'}
        testID={testID}
      />
    </View>
  );
}

export default function PropertyAnalysisScreen() {
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('375000');
  const [rate, setRate] = useState('6.5');
  const [termYears, setTermYears] = useState('30');
  const [tax, setTax] = useState('4100');
  const [insurance, setInsurance] = useState('1800');
  const [hoa, setHoa] = useState('0');
  const [pmi, setPmi] = useState('0.85');
  const [closing, setClosing] = useState('9000');
  const [selected, setSelected] = useState(1); // default highlight: 10% down

  const result: PropertyAnalysisResult | null = useMemo(() => {
    try {
      return analyzeProperty({
        purchasePrice: num(price),
        annualRatePct: num(rate),
        termMonths: Math.round(num(termYears) * 12),
        propertyTaxAnnual: num(tax),
        homeInsuranceAnnual: num(insurance),
        hoaMonthly: num(hoa),
        pmiAnnualPct: num(pmi),
        closingCosts: num(closing),
      });
    } catch {
      return null;
    }
  }, [price, rate, termYears, tax, insurance, hoa, pmi, closing]);

  const option = result?.options[selected] ?? null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Property</Text>
        <Field
          label="Address (optional — labels this analysis)"
          value={address}
          onChange={setAddress}
          placeholder="123 Main St, Fort Lauderdale"
          testID="prop-address"
          keyboard="text"
        />
        <Field label="List / offer price" value={price} onChange={setPrice} placeholder="375000" testID="prop-price" />
        <View style={styles.pairRow}>
          <View style={styles.flex}>
            <Field label="Property tax ($/yr)" value={tax} onChange={setTax} placeholder="4100" testID="prop-tax" />
          </View>
          <View style={styles.flex}>
            <Field label="Insurance ($/yr)" value={insurance} onChange={setInsurance} placeholder="1800" testID="prop-insurance" />
          </View>
        </View>
        <View style={styles.pairRow}>
          <View style={styles.flex}>
            <Field label="HOA ($/mo)" value={hoa} onChange={setHoa} placeholder="0" testID="prop-hoa" />
          </View>
          <View style={styles.flex}>
            <Field label="Closing costs ($)" value={closing} onChange={setClosing} placeholder="9000" testID="prop-closing" />
          </View>
        </View>

        <Text style={styles.section}>Financing</Text>
        <View style={styles.pairRow}>
          <View style={styles.flex}>
            <Field label="Rate (%)" value={rate} onChange={setRate} placeholder="6.5" testID="prop-rate" />
          </View>
          <View style={styles.flex}>
            <Field label="Term (years)" value={termYears} onChange={setTermYears} placeholder="30" testID="prop-term" />
          </View>
        </View>
        <Field label="PMI (%/yr, while under 20% down)" value={pmi} onChange={setPmi} placeholder="0.85" testID="prop-pmi" />

        <SaveScenarioButton
          type="PROPERTY_ANALYSIS"
          defaultName={address.trim() !== '' ? address.trim() : 'Property analysis'}
          getInputs={() =>
            result === null
              ? null
              : {
                  address: address.trim(),
                  purchasePrice: num(price),
                  annualRatePct: num(rate),
                  termMonths: Math.round(num(termYears) * 12),
                  propertyTaxAnnual: num(tax),
                  homeInsuranceAnnual: num(insurance),
                  hoaMonthly: num(hoa),
                  pmiAnnualPct: num(pmi),
                  closingCosts: num(closing),
                }
          }
        />

        <View style={styles.results} testID="prop-results">
          {result === null ? (
            <Text style={styles.mutedText}>
              Enter the property&rsquo;s price and costs to compare down-payment options.
            </Text>
          ) : (
            <>
              {address.trim() !== '' ? (
                <Text style={styles.addressLine} testID="prop-address-line">
                  {address.trim()}
                </Text>
              ) : null}
              <View style={styles.tierRow}>
                <Text style={styles.tierHead}>Down</Text>
                <Text style={styles.tierHeadWide}>Monthly</Text>
                <Text style={styles.tierHeadWide}>Cash to close</Text>
              </View>
              {result.options.map((tier, index) => (
                <Pressable
                  key={tier.downPct}
                  onPress={() => setSelected(index)}
                  style={[styles.tierRow, styles.tierButton, index === selected && styles.tierSelected]}
                  testID={`prop-tier-${tier.downPct}`}
                >
                  <Text style={[styles.tierCell, index === selected && styles.tierCellSelected]}>
                    {tier.downPct}%
                  </Text>
                  <Text style={[styles.tierCellWide, index === selected && styles.tierCellSelected]}>
                    {money(tier.totalMonthly)}
                  </Text>
                  <Text style={[styles.tierCellWide, index === selected && styles.tierCellSelected]}>
                    {money(tier.cashToClose, false)}
                  </Text>
                </Pressable>
              ))}
              {option !== null ? (
                <View style={styles.breakdown} testID="prop-breakdown">
                  <Text style={styles.breakdownTitle}>
                    With {option.downPct}% down ({money(option.downPaymentAmount, false)})
                  </Text>
                  <Text style={styles.detailLine}>
                    Loan {money(option.loanAmount, false)} · P&I {money(option.monthlyPrincipalInterest)}
                    {option.monthlyPmi > 0 ? ` · PMI ${money(option.monthlyPmi)}` : ' · no PMI'}
                  </Text>
                  <Text style={styles.detailLine}>
                    Taxes {money(option.monthlyPropertyTax)} · insurance {money(option.monthlyInsurance)}
                    {option.monthlyHoa > 0 ? ` · HOA ${money(option.monthlyHoa)}` : ''}
                  </Text>
                  {option.monthlyPmi > 0 ? (
                    <Text style={styles.footnote}>
                      PMI drops off once the loan reaches 80% of the purchase price.
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <Text style={styles.footnote}>
                Estimates for comparison only — not a loan offer or pre-qualification.
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
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  addressLine: {
    ...typography.heading,
    fontSize: 16,
    color: colors.textPrimary,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    marginTop: 4,
    backgroundColor: colors.background,
  },
  tierSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  tierHead: {
    flex: 0.6,
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tierHeadWide: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  tierCell: {
    flex: 0.6,
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tierCellWide: {
    flex: 1,
    ...typography.body,
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  tierCellSelected: {
    color: colors.textOnPrimary,
  },
  breakdown: {
    marginTop: spacing.sm,
    gap: 2,
  },
  breakdownTitle: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  detailLine: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footnote: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  mutedText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
