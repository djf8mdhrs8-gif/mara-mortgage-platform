import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Line, Polyline, Text as SvgText } from 'react-native-svg';

import { colors, spacing, typography } from '@/theme/tokens';

export interface WealthSeriesPoint {
  year: number;
  buyerNetWealth: number;
  renterNetWealth: number;
}

const CHART_HEIGHT = 220;
const PAD = { top: 12, right: 12, bottom: 22, left: 46 };

/** $1.4M / $820k / $950 — compact axis labels. */
function compactMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

/**
 * Buyer-vs-renter net-wealth projection as a dual-line chart, with the
 * break-even year marked. Pure react-native-svg — renders identically on
 * native and web.
 */
export function WealthChart({
  points,
  breakEvenYear,
}: {
  points: WealthSeriesPoint[];
  breakEvenYear: number | null;
}) {
  const [measured, setMeasured] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  // onLayout doesn't always fire on react-native-web, so fall back to an
  // estimate from the window width (screen + card padding ≈ 66px) until the
  // real measurement arrives.
  const width = measured > 0 ? measured : Math.max(windowWidth - 66, 200);

  if (points.length === 0) return null;

  const values = points.flatMap((p) => [p.buyerNetWealth, p.renterNetWealth]);
  const rawMin = Math.min(...values, 0);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || 1;

  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;

  const x = (year: number): number =>
    PAD.left + (points.length === 1 ? plotW / 2 : ((year - 1) / (points.length - 1)) * plotW);
  const y = (value: number): number => PAD.top + ((rawMax - value) / span) * plotH;

  const toPolyline = (pick: (p: WealthSeriesPoint) => number): string =>
    points.map((p) => `${x(p.year).toFixed(1)},${y(pick(p)).toFixed(1)}`).join(' ');

  // Up to ~6 x-labels so long horizons don't collide.
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  const xLabels = points.filter((p) => p.year === 1 || p.year % labelEvery === 0);

  return (
    <View style={styles.wrap} onLayout={(e) => setMeasured(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={CHART_HEIGHT} testID="wealth-chart">
          {[rawMax, (rawMax + rawMin) / 2, rawMin].map((v) => (
            <Line
              key={`grid-${v}`}
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}
          {[rawMax, (rawMax + rawMin) / 2, rawMin].map((v) => (
            <SvgText
              key={`ylab-${v}`}
              x={PAD.left - 6}
              y={y(v) + 4}
              fontSize={10}
              fill={colors.textSecondary}
              textAnchor="end"
            >
              {compactMoney(v)}
            </SvgText>
          ))}
          {breakEvenYear !== null && points.length > 1 ? (
            <Line
              x1={x(breakEvenYear)}
              x2={x(breakEvenYear)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke={colors.success}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ) : null}
          <Polyline
            points={toPolyline((p) => p.renterNetWealth)}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2.5}
          />
          <Polyline
            points={toPolyline((p) => p.buyerNetWealth)}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
          />
          {xLabels.map((p) => (
            <SvgText
              key={`xlab-${p.year}`}
              x={x(p.year)}
              y={CHART_HEIGHT - 6}
              fontSize={10}
              fill={colors.textSecondary}
              textAnchor="middle"
            >
              {`Y${p.year}`}
            </SvgText>
          ))}
        </Svg>
      ) : null}
      <View style={styles.legend}>
        <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        <Text style={styles.legendText}>Buy</Text>
        <View style={[styles.dot, { backgroundColor: colors.accent }]} />
        <Text style={styles.legendText}>Rent</Text>
        {breakEvenYear !== null ? (
          <>
            <View style={[styles.dash, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>Break-even</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: spacing.sm,
  },
  dash: {
    width: 14,
    height: 2,
    marginLeft: spacing.sm,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
