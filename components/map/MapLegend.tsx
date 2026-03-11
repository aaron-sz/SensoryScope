/**
 * MapLegend — Floating blurred card showing the sensory score color key.
 *
 * Responsive: on tablets (width ≥ 600px) positions to the top-right
 * to avoid collision with the larger FAB row.
 */
import { BlurView } from 'expo-blur';
import React, { memo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { DarkColors, Spacing } from '../../constants/theme';

// ── Data ──────────────────────────────────────────────────────────────────────
interface LegendRowData {
  color: string;
  label: string;
  range: string;
}

const ROWS: LegendRowData[] = [
  { color: DarkColors.calm,     label: 'Calm',     range: '1–3' },
  { color: DarkColors.moderate, label: 'Moderate', range: '4–6' },
  { color: DarkColors.intense,  label: 'Intense',  range: '7–10' },
  { color: '#4A5568',           label: 'Unrated',  range: '–' },
];

const TABLET_BREAKPOINT = 600;

// ── Props ─────────────────────────────────────────────────────────────────────
interface MapLegendProps {
  bottomOffset: number;
  /** Top offset used only on tablet layout */
  topOffset?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────
const MapLegend = memo(function MapLegend({ bottomOffset, topOffset = 120 }: MapLegendProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  const positionStyle = isTablet
    ? { top: topOffset, right: 16, left: undefined }
    : { bottom: bottomOffset, left: 14, right: undefined };

  return (
    <View
      style={[styles.outer, positionStyle]}
      pointerEvents="none"
      accessibilityLabel="Sensory score color key"
    >
      <BlurView intensity={60} tint="dark" style={styles.blur}>
        {ROWS.map((row) => (
          <LegendRow key={row.label} {...row} />
        ))}
      </BlurView>
    </View>
  );
});

export default MapLegend;

// ── LegendRow ─────────────────────────────────────────────────────────────────
const LegendRow = memo(function LegendRow({ color, label, range }: LegendRowData) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.range}>{range}</Text>
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    zIndex: 10,
  },
  blur: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 3,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  range: {
    fontSize: 10,
    color: '#94A3B8',
    minWidth: 20,
    textAlign: 'right',
  },
});
