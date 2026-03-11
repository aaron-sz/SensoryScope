/**
 * TrafficLegend — Gradient color key for the traffic congestion overlay.
 *
 * Shows a smooth green → red gradient bar with labels beneath it.
 * Appears when traffic is toggled ON.
 *
 * Responsive: on tablets positions itself below the sensory legend (top-right).
 */
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Spacing } from '../../constants/theme';
import { TRAFFIC_COLORS } from './TrafficLayer';

// ── Constants ─────────────────────────────────────────────────────────────────
const TABLET_BREAKPOINT = 600;
const LEGEND_WIDTH = 170;

// Gradient stops: free-flowing → severe jam
const GRADIENT_COLORS: [string, string, string, string, string] = [
  TRAFFIC_COLORS.low,
  '#84CC16',
  TRAFFIC_COLORS.moderate,
  TRAFFIC_COLORS.heavy,
  TRAFFIC_COLORS.severe,
];

const LABELS = ['Free', 'Light', 'Mod.', 'Heavy', 'Severe'] as const;

// ── Props ─────────────────────────────────────────────────────────────────────
interface TrafficLegendProps {
  bottomOffset: number;
  /** Top offset used only on tablet layout (appears below sensory legend) */
  topOffset?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────
const TrafficLegend = memo(function TrafficLegend({
  bottomOffset,
  topOffset = 230,
}: TrafficLegendProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  const positionStyle = isTablet
    ? { top: topOffset, right: 16, left: undefined, bottom: undefined }
    : { bottom: bottomOffset, left: 14, right: undefined, top: undefined };

  return (
    <View
      style={[styles.outer, positionStyle]}
      pointerEvents="none"
      accessibilityLabel="Traffic congestion color key"
    >
      <BlurView intensity={60} tint="dark" style={styles.blur}>
        <Text style={styles.heading}>Traffic</Text>

        {/* Gradient bar */}
        <LinearGradient
          colors={GRADIENT_COLORS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBar}
        />

        {/* Labels row */}
        <View style={styles.labelsRow}>
          {LABELS.map((label) => (
            <Text key={label} style={styles.label}>
              {label}
            </Text>
          ))}
        </View>
      </BlurView>
    </View>
  );
});

export default TrafficLegend;

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    zIndex: 10,
    width: LEGEND_WIDTH,
  },
  blur: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
  },
  heading: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  gradientBar: {
    height: 6,
    borderRadius: 999,
    marginBottom: 5,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 8,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
