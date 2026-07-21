import { buildAmortization, type AmortizationEntry } from '@mara/mortgage-calc';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { exportAmortizationPdf } from '@/features/calculators/exportAmortizationPdf';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, spacing, typography } from '@/theme/tokens';

function money(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

function Row({ entry }: { entry: AmortizationEntry }) {
  return (
    <View style={[styles.row, entry.paymentNumber % 2 === 0 && styles.rowAlt]}>
      <Text style={[styles.cell, styles.cellNum]}>{entry.paymentNumber}</Text>
      <Text style={styles.cell}>{money(entry.payment)}</Text>
      <Text style={styles.cell}>{money(entry.interest)}</Text>
      <Text style={styles.cell}>{money(entry.principal)}</Text>
      <Text style={[styles.cell, styles.cellBalance]}>{money(entry.balance)}</Text>
    </View>
  );
}

export default function AmortizationScreen() {
  const params = useLocalSearchParams<{
    principal?: string;
    rate?: string;
    term?: string;
    label?: string;
  }>();

  const principal = Number(params.principal);
  const annualRatePct = Number(params.rate);
  const termMonths = Number(params.term);

  const result = useMemo(() => {
    try {
      return buildAmortization({ principal, annualRatePct, termMonths });
    } catch {
      return null;
    }
  }, [principal, annualRatePct, termMonths]);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (result === null) {
    return (
      <View style={styles.empty}>
        <Text style={styles.mutedText}>
          Missing or invalid loan parameters — open this screen from a calculator.
        </Text>
      </View>
    );
  }

  const onExport = async (): Promise<void> => {
    setExporting(true);
    setExportError(null);
    try {
      await exportAmortizationPdf({
        principal,
        annualRatePct,
        termMonths,
        label: typeof params.label === 'string' ? params.label : undefined,
      });
    } catch {
      setExportError('Export failed — check your connection and try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.summary} testID="amort-summary">
        <Text style={styles.summaryTitle}>
          {money(principal)} · {annualRatePct}% · {Math.round(termMonths / 12)} yr
        </Text>
        <Text style={styles.summaryDetail}>
          Payment {money(result.monthlyPayment)} · Total interest {money(result.totalInterest)} ·
          Total paid {money(result.totalPaid)} · {result.payoffMonths} payments
        </Text>
        <PrimaryButton title="Export PDF" onPress={() => void onExport()} loading={exporting} />
        {exportError !== null ? <Text style={styles.error}>{exportError}</Text> : null}
      </View>

      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.cellNum, styles.headerCell]}>#</Text>
        <Text style={[styles.cell, styles.headerCell]}>Payment</Text>
        <Text style={[styles.cell, styles.headerCell]}>Interest</Text>
        <Text style={[styles.cell, styles.headerCell]}>Principal</Text>
        <Text style={[styles.cell, styles.cellBalance, styles.headerCell]}>Balance</Text>
      </View>
      <FlatList
        data={result.schedule}
        keyExtractor={(entry) => String(entry.paymentNumber)}
        renderItem={({ item }) => <Row entry={item} />}
        initialNumToRender={24}
        windowSize={11}
        testID="amort-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  summary: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryTitle: {
    ...typography.heading,
    fontSize: 18,
    color: colors.textPrimary,
  },
  summaryDetail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  rowAlt: {
    backgroundColor: colors.surface,
  },
  headerRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerCell: {
    fontWeight: '700',
    color: colors.primary,
  },
  cell: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  cellNum: {
    flex: 0.45,
    textAlign: 'left',
  },
  cellBalance: {
    flex: 1.2,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
  mutedText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
