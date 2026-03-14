/**
 * MapLegend — Floating card showing the sensory score color key.
 *
 * Solid themed background (white in light mode, dark navy in dark mode)
 * so it reads cleanly against any map style.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Radius, Shadows, Spacing, useColors } from '../../constants/theme';

const TABLET_BREAKPOINT = 600;

// ── Props ─────────────────────────────────────────────────────────────────────
interface MapLegendProps {
  bottomOffset: number;
  topOffset?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────
const MapLegend = memo(function MapLegend({ bottomOffset, topOffset = 120 }: MapLegendProps) {
  const C = useColors();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  const positionStyle = isTablet
    ? { top: topOffset, right: 16, left: undefined }
    : { bottom: bottomOffset, left: 14, right: undefined };

  const rows = [
    { color: C.calm,     label: 'Calm',     range: '1–3'  },
    { color: C.moderate, label: 'Moderate', range: '4–6'  },
    { color: C.intense,  label: 'Intense',  range: '7–10' },
    { color: C.textDim,  label: 'Unrated',  range: '–'    },
  ];

  return (
    <View
      style={[styles.card, positionStyle, { backgroundColor: C.elevated, borderColor: C.border }]}
      pointerEvents="none"
      accessibilityLabel="Sensory score color key"
    >
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: row.color }]} />
          <Text style={[styles.label, { color: C.text }]} allowFontScaling={false}>
            {row.label}
          </Text>
          <Text style={[styles.range, { color: C.textMuted }]} allowFontScaling={false}>
            {row.range}
          </Text>
        </View>
      ))}
    </View>
  );
});

export default MapLegend;

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    zIndex: 10,
    width: 136,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
    ...Shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 7,
    flexShrink: 0,
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  range: {
    fontSize: 10,
    fontWeight: '500',
    width: 28,
    textAlign: 'right',
    flexShrink: 0,
  },
});
