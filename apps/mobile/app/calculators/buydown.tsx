import {
  calculatePermanentBuydown,
  calculateTemporaryBuydown,
  type PermanentBuydownResult,
  type TemporaryBuydownResult,
} from '@mara/mortgage-calc';
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

type Mode = '1-0' | '2-1' | '3-2-1' | 'permanent';

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

export default function BuydownScreen() {
  const [mode, setMode] = useState<Mode>('2-1');
  const [loan, setLoan] = useState('300000');
  const [rate, setRate] = useState('7');
  const [termYears, setTermYears] = useState('30');
  const [boughtRate, setBoughtRate] = useState('6');
  const [pointsCost, setPointsCost] = useState('6000');

  const temp: TemporaryBuydownResult | null = useMemo(() => {
    if (mode === 'permanent') return null;
    try {
      return calculateTemporaryBuydown({
        loanAmount: num(loan),
        annualRatePct: num(rate),
        termMonths: Math.round(num(termYears) * 12),
        type: mode,
      });
    } catch {
      return null;
    }
  }, [mode, loan, rate, termYears]);

  const perm: PermanentBuydownResult | null = useMemo(() => {
    if (mode !== 'permanent') return null;
    try {
      return calculatePermanentBuydown({
        loanAmount: num(loan),
        annualRatePct: num(rate),
        reducedRatePct: num(boughtRate),
        termMonths: Math.round(num(termYears) * 12),
        cost: num(pointsCost),
      });
    } catch {
      return null;
    }
  }, [mode, loan, rate, termYears, boughtRate, pointsCost]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.toggle}>
          {(['1-0', '2-1', '3-2-1', 'permanent'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.toggleButton, mode === m && styles.toggleActive]}
              testID={`bd-mode-${m}`}
            >
              <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                {m === 'permanent' ? 'Points' : m}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.modeHint}>
          {mode === 'permanent'
            ? 'Pay discount points once for a lower rate over the whole loan.'
            : mode === '1-0'
              ? 'Rate starts 1% lower in year 1, then returns to the note rate.'
              : mode === '2-1'
                ? 'Rate starts 2% lower in year 1 and 1% lower in year 2, then returns to the note rate.'
                : 'Rate starts 3% lower, then 2%, then 1%, then returns to the note rate.'}
        </Text>

        <Text style={styles.section}>Loan</Text>
        <Field label="Loan amount" value={loan} onChange={setLoan} placeholder="300000" testID="bd-loan" />
        <View style={styles.pairRow}>
          <View style={styles.flex}>
            <Field label="Note rate (%)" value={rate} onChange={setRate} placeholder="7" testID="bd-rate" />
          </View>
          <View style={styles.flex}>
            <Field label="Term (years)" value={termYears} onChange={setTermYears} placeholder="30" testID="bd-term" />
          </View>
        </View>
        {mode === 'permanent' ? (
          <View style={styles.pairRow}>
            <View style={styles.flex}>
              <Field label="Bought-down rate (%)" value={boughtRate} onChange={setBoughtRate} placeholder="6" testID="bd-bought-rate" />
            </View>
            <View style={styles.flex}>
              <Field label="Points cost ($)" value={pointsCost} onChange={setPointsCost} placeholder="6000" testID="bd-cost" />
            </View>
          </View>
        ) : null}

        <SaveScenarioButton
          type="BUYDOWN"
          defaultName={mode === 'permanent' ? 'Discount points' : `${mode} buydown`}
          getInputs={() => {
            if (mode === 'permanent') {
              return perm === null
                ? null
                : {
                    mode: 'permanent',
                    loanAmount: num(loan),
                    annualRatePct: num(rate),
                    reducedRatePct: num(boughtRate),
                    termMonths: Math.round(num(termYears) * 12),
                    cost: num(pointsCost),
                  };
            }
            return temp === null
              ? null
              : {
                  loanAmount: num(loan),
                  annualRatePct: num(rate),
                  termMonths: Math.round(num(termYears) * 12),
                  type: mode,
                };
          }}
        />

        <View style={styles.results} testID="bd-results">
          {mode !== 'permanent' ? (
            temp === null ? (
              <Text style={styles.mutedText}>
                Enter the loan to see the buydown schedule. The note rate must be at least the
                first-year reduction.
              </Text>
            ) : (
              <>
                <Text style={styles.bigLine} testID="bd-cost-line">
                  Buydown cost: {money(temp.buydownCost)}
                </Text>
                <Text style={styles.detailLine}>
                  Usually paid by the seller or builder as a credit — it equals every dollar of
                  payment savings below.
                </Text>
                <View style={styles.divider} />
                <View style={styles.scheduleRow}>
                  <Text style={styles.scheduleHead}>Year</Text>
                  <Text style={styles.scheduleHead}>Rate</Text>
                  <Text style={styles.scheduleHeadWide}>Payment</Text>
                  <Text style={styles.scheduleHeadWide}>Saves/mo</Text>
                </View>
                {temp.years.map((row) => (
                  <View key={row.year} style={styles.scheduleRow} testID={`bd-year-${row.year}`}>
                    <Text style={styles.scheduleCell}>{row.year}</Text>
                    <Text style={styles.scheduleCell}>{row.ratePct}%</Text>
                    <Text style={styles.scheduleCellWide}>{money(row.payment)}</Text>
                    <Text style={[styles.scheduleCellWide, { color: colors.success }]}>
                      {money(row.monthlySavings)}
                    </Text>
                  </View>
                ))}
                <View style={styles.scheduleRow}>
                  <Text style={styles.scheduleCell}>{temp.years.length + 1}+</Text>
                  <Text style={styles.scheduleCell}>{num(rate)}%</Text>
                  <Text style={styles.scheduleCellWide}>{money(temp.notePayment)}</Text>
                  <Text style={styles.scheduleCellWide}>—</Text>
                </View>
              </>
            )
          ) : perm === null ? (
            <Text style={styles.mutedText}>
              Enter the loan, the rate you can buy down to, and what the points cost.
            </Text>
          ) : (
            <>
              <Text style={[styles.bigLine, { color: colors.success }]} testID="bd-perm-savings">
                Save {money(perm.monthlySavings)}/month for the life of the loan
              </Text>
              <Text style={styles.detailLine} testID="bd-perm-breakeven">
                Payment {money(perm.notePayment)} → {money(perm.reducedPayment)} · Break-even on
                points: {perm.breakEvenMonths} months ({yearsAndMonths(perm.breakEvenMonths)})
              </Text>
              <Text style={styles.detailLine}>
                Interest over the full term: {money(perm.noteTotalInterest)} →{' '}
                {money(perm.reducedTotalInterest)} — saves {money(perm.lifetimeInterestSavings)}
              </Text>
              <Text style={styles.footnote}>
                Worth it if you keep the loan past break-even; selling or refinancing sooner
                forfeits the remaining benefit. Estimates only — not financial advice.
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
  toggle: {
    flexDirection: 'row',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignSelf: 'flex-start',
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
  modeHint: {
    ...typography.caption,
    color: colors.textSecondary,
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
    color: colors.textPrimary,
  },
  detailLine: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  scheduleHead: {
    flex: 0.6,
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  scheduleHeadWide: {
    flex: 1,
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  scheduleCell: {
    flex: 0.6,
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  scheduleCellWide: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
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
