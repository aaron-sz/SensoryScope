/**
 * TrafficLayer — Mapbox real-time traffic congestion visualization.
 *
 * Uses the built-in Mapbox traffic vector tileset:
 *   mapbox://mapbox.mapbox-traffic-v1
 *
 * Each road segment has a `congestion` property:
 *   "low" | "moderate" | "heavy" | "severe"
 *
 * The LineLayer colors each segment with a green → red gradient
 * and scales line width with zoom level for a polished feel.
 *
 * Opacity is controlled externally (0 = hidden, 1 = fully visible)
 * so the parent can animate the fade in/out smoothly.
 */
import { LineLayer, type LineLayerStyle, VectorSource } from '@rnmapbox/maps';
import React, { memo, useMemo } from 'react';

// ── Traffic color palette ─────────────────────────────────────────────────────
export const TRAFFIC_COLORS = {
  low:      '#22C55E', // green     — free flowing
  moderate: '#EAB308', // yellow    — slowing
  heavy:    '#F97316', // orange    — heavy delay
  severe:   '#EF4444', // red       — near standstill
  unknown:  '#94A3B8', // slate     — no data
} as const;

// Brighter variants for dark mode — same hues, higher luminance
const TRAFFIC_COLORS_DARK = {
  low:      '#4ADE80', // green-400
  moderate: '#FACC15', // yellow-400
  heavy:    '#FB923C', // orange-400
  severe:   '#F87171', // red-400
  unknown:  '#94A3B8',
} as const;

// ── Filter: only render segments with known congestion ────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TRAFFIC_FILTER = ['in', 'congestion', 'low', 'moderate', 'heavy', 'severe'] as any;

// ── Component ─────────────────────────────────────────────────────────────────
interface TrafficLayerProps {
  /** Whether the traffic source is mounted at all */
  visible: boolean;
  /** Opacity multiplier 0–1 for fade animation */
  opacity: number;
  /** Dark mode flag for emissive + color adjustments */
  dark?: boolean;
}

const TrafficLayer = memo(function TrafficLayer({ visible, opacity, dark = false }: TrafficLayerProps) {
  if (!visible) return null;

  const colors = dark ? TRAFFIC_COLORS_DARK : TRAFFIC_COLORS;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const trafficLineStyle = useMemo<LineLayerStyle>(
    () => ({
      lineColor: [
        'match',
        ['get', 'congestion'],
        'low',      colors.low,
        'moderate', colors.moderate,
        'heavy',    colors.heavy,
        'severe',   colors.severe,
        colors.unknown,
      ] as unknown as string,

      lineWidth: [
        'interpolate', ['linear'], ['zoom'],
        8,  1.0,
        11, 2.0,
        14, 3.5,
        17, 6.0,
      ] as unknown as number,

      lineOpacity: [
        'interpolate', ['linear'], ['zoom'],
        7,  0,
        9,  0.6 * opacity,
        12, 0.88 * opacity,
        16, opacity,
      ] as unknown as number,

      lineCap: 'round',
      lineJoin: 'round',
      lineEmissiveStrength: dark ? 0.7 : 0,
    } as LineLayerStyle),
    [opacity, dark, colors],
  );

  return (
    <VectorSource
      id="mapbox-traffic"
      url="mapbox://mapbox.mapbox-traffic-v1"
    >
      <LineLayer
        id="traffic-congestion"
        sourceLayerID="traffic"
        style={trafficLineStyle}
        filter={TRAFFIC_FILTER}
      />
    </VectorSource>
  );
});

export default TrafficLayer;
