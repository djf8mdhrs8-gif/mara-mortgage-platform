import { calculateRentVsBuy, type RentVsBuyResult } from '@mara/mortgage-calc';
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

import { SaveScenarioButton } from '@/components/SaveScenarioButton';
import { WealthChart } from '@/components/WealthChart';
import { calculatorDefaults } from '@/features/config/useCalculatorConfig';
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
    maximumFractionDigits: 0,
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

function Pair({ children }: { children: React.ReactNode }) {
  return <View style={styles.pairRow}>{children}</View>;
}

export default function RentVsBuyScreen() {
  const [d] = useState(calculatorDefaults); // admin-tunable prefills
  const [price, setPrice] = useState('400000');
  const [downPct, setDownPct] = useState('20');
  const [rate, setRate] = useState(String(d.defaultRatePct));
  const [termYears, setTermYears] = useState('30');
  const [rent, setRent] = useState('2200');
  const [rentGrowth, setRentGrowth] = useState('3');
  const [horizon, setHorizon] = useState('10');
  const [appreciation, setAppreciation] = useState('3');
  const [investReturn, setInvestReturn] = useState('7');
  const [taxPct, setTaxPct] = useState(String(d.propertyTaxAnnualPct));
  const [insPct, setInsPct] = useState('0.5');
  const [maintPct, setMaintPct] = useState('1');
  const [sellPct, setSellPct] = useState('6');

  const result: RentVsBuyResult | null = useMemo(() => {
    try {
      return calculateRentVsBuy({
        purchasePrice: num(price),
        downPayment: { type: 'percent', value: num(downPct) },
        annualRatePct: num(rate),
        termMonths: Math.round(num(termYears) * 12),
        horizonYears: Math.round(num(horizon)),
        monthlyRent: num(rent),
        rentGrowthPct: num(rentGrowth),
        homeAppreciationPct: num(appreciation),
        investmentReturnPct: num(investReturn),
        propertyTaxAnnualPct: num(taxPct),
        homeInsuranceAnnualPct: num(insPct),
        maintenanceAnnualPct: num(maintPct),
        buyClosingCostsPct: 3,
        sellClosingCostsPct: num(sellPct),
      });
    } catch {
      return null;
    }
  }, [
    price,
    downPct,
    rate,
    termYears,
    rent,
    rentGrowth,
    horizon,
    appreciation,
    investReturn,
    taxPct,
    insPct,
    maintPct,
    sellPct,
  ]);

  const buyingWins = result !== null && result.wealthDifference >= 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Buying</Text>
        <Field label="Home price" value={price} onChange={setPrice} placeholder="400000" testID="rvb-price" />
        <Pair>
          <View style={styles.flex}>
            <Field label="Down payment (%)" value={downPct} onChange={setDownPct} placeholder="20" testID="rvb-down" />
          </View>
          <View style={styles.flex}>
            <Field label="Rate (%)" value={rate} onChange={setRate} placeholder="6.5" testID="rvb-rate" />
          </View>
        </Pair>
        <Pair>
          <View style={styles.flex}>
            <Field label="Term (years)" value={termYears} onChange={setTermYears} placeholder="30" testID="rvb-term" />
          </View>
          <View style={styles.flex}>
            <Field label="Selling costs (%)" value={sellPct} onChange={setSellPct} placeholder="6" testID="rvb-sell" />
          </View>
        </Pair>

        <Text style={styles.section}>Renting</Text>
        <Pair>
          <View style={styles.flex}>
            <Field label="Monthly rent" value={rent} onChange={setRent} placeholder="2200" testID="rvb-rent" />
          </View>
          <View style={styles.flex}>
            <Field label="Rent growth (%/yr)" value={rentGrowth} onChange={setRentGrowth} placeholder="3" testID="rvb-rent-growth" />
          </View>
        </Pair>

        <Text style={styles.section}>Assumptions</Text>
        <Pair>
          <View style={styles.flex}>
            <Field label="Years to compare" value={horizon} onChange={setHorizon} placeholder="10" testID="rvb-horizon" />
          </View>
          <View style={styles.flex}>
            <Field label="Home appreciation (%/yr)" value={appreciation} onChange={setAppreciation} placeholder="3" testID="rvb-appreciation" />
          </View>
        </Pair>
        <Pair>
          <View style={styles.flex}>
            <Field label="Investment return (%/yr)" value={investReturn} onChange={setInvestReturn} placeholder="7" testID="rvb-return" />
          </View>
          <View style={styles.flex}>
            <Field label="Property tax (%/yr)" value={taxPct} onChange={setTaxPct} placeholder="1.1" testID="rvb-tax" />
          </View>
        </Pair>
        <Pair>
          <View style={styles.flex}>
            <Field label="Insurance (%/yr)" value={insPct} onChange={setInsPct} placeholder="0.5" testID="rvb-insurance" />
          </View>
          <View style={styles.flex}>
            <Field label="Maintenance (%/yr)" value={maintPct} onChange={setMaintPct} placeholder="1" testID="rvb-maintenance" />
          </View>
        </Pair>

        <SaveScenarioButton
          type="RENT_VS_BUY"
          defaultName="Rent vs. buy"
          getInputs={() =>
            result === null
              ? null
              : {
                  purchasePrice: num(price),
                  downPayment: { type: 'percent', value: num(downPct) },
                  annualRatePct: num(rate),
                  termMonths: Math.round(num(termYears) * 12),
                  horizonYears: Math.round(num(horizon)),
                  monthlyRent: num(rent),
                  rentGrowthPct: num(rentGrowth),
                  homeAppreciationPct: num(appreciation),
                  investmentReturnPct: num(investReturn),
                  propertyTaxAnnualPct: num(taxPct),
                  homeInsuranceAnnualPct: num(insPct),
                  maintenanceAnnualPct: num(maintPct),
                  buyClosingCostsPct: 3,
                  sellClosingCostsPct: num(sellPct),
                }
          }
        />

        <View style={styles.results} testID="rvb-results">
          {result === null ? (
            <Text style={styles.mutedText}>
              Fill in the home, rent, and assumptions to compare paths.
            </Text>
          ) : (
            <>
              <Text
                style={[styles.bigLine, { color: buyingWins ? colors.success : colors.warning }]}
                testID="rvb-verdict"
              >
                {buyingWins
                  ? `Buying comes out ahead by ${money(result.wealthDifference)}`
                  : `Renting comes out ahead by ${money(Math.abs(result.wealthDifference))}`}
              </Text>
              <Text style={styles.detailLine} testID="rvb-breakeven">
                {result.breakEvenYear === null
                  ? `Buying doesn't catch up within ${result.years.length} years on these assumptions`
                  : result.breakEvenYear === 1
                    ? 'Buying is ahead from year 1'
                    : `Buying pulls ahead in year ${result.breakEvenYear}`}
              </Text>
              <Text style={styles.detailLine}>
                After {result.years.length} years: buying {money(result.finalBuyerNetWealth)} vs
                renting {money(result.finalRenterNetWealth)} · P&I{' '}
                {money(result.monthlyPrincipalInterest)}/mo · cash to buy{' '}
                {money(result.initialBuyerOutlay)}
              </Text>
              <View style={styles.divider} />
              <WealthChart points={result.years} breakEvenYear={result.breakEvenYear} />
              <Text style={styles.footnote}>
                Buying wealth = home value minus selling costs and loan balance, plus any invested
                monthly savings. Renting wealth = your down payment and closing-cost cash invested,
                plus invested monthly savings. Estimates only — not financial advice.
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
