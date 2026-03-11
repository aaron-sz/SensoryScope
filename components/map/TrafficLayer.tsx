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
 * Mapbox's lineOpacityTransition drives the CSS-level transition.
 *
 * Place this component INSIDE a <MapView> as a direct child.
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

// ── Filter: only render segments with known congestion ────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TRAFFIC_FILTER = ['in', 'congestion', 'low', 'moderate', 'heavy', 'severe'] as any;

// ── Component ─────────────────────────────────────────────────────────────────
interface TrafficLayerProps {
  /** Whether the traffic source is mounted at all */
  visible: boolean;
  /**
   * Opacity multiplier 0–1.
   * Used to fade the layer in/out via Mapbox's lineOpacityTransition.
   * The parent drives this from 0 → 1 when toggling on, 1 → 0 when toggling off.
   */
  opacity: number;
}

const TrafficLayer = memo(function TrafficLayer({ visible, opacity }: TrafficLayerProps) {
  if (!visible) return null;

  // Build style dynamically so the transition fires when opacity changes.
  // useMemo keeps the object stable between renders when opacity hasn't changed.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const trafficLineStyle = useMemo<LineLayerStyle>(
    () => ({
      lineColor: [
        'match',
        ['get', 'congestion'],
        'low',      TRAFFIC_COLORS.low,
        'moderate', TRAFFIC_COLORS.moderate,
        'heavy',    TRAFFIC_COLORS.heavy,
        'severe',   TRAFFIC_COLORS.severe,
        TRAFFIC_COLORS.unknown,
      ] as unknown as string,

      lineWidth: [
        'interpolate', ['linear'], ['zoom'],
        8,  1.0,
        11, 2.0,
        14, 3.5,
        17, 6.0,
      ] as unknown as number,

      // Blend zoom-based fade with the external opacity multiplier
      lineOpacity: [
        'interpolate', ['linear'], ['zoom'],
        7,  0,
        9,  0.6 * opacity,
        12, 0.88 * opacity,
        16, opacity,
      ] as unknown as number,

      lineCap: 'round',
      lineJoin: 'round',
    }),
    [opacity],
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
