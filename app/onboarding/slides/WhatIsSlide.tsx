import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { C } from '../../../constants/onboarding';

const { width: W } = Dimensions.get('window');

interface Props {
  height: number;
  isActive: boolean;
}

// ── Equalizer bars for Sound ──────────────────────────────────────────────────
// Deterministic "random" heights so the waveform looks organic, not uniform
const EQ_HEIGHTS = [0.3, 0.7, 0.5, 1, 0.6, 0.85, 0.4, 0.9, 0.55, 0.75, 0.35, 0.65, 0.8, 0.45, 0.6];

function SoundViz() {
  return (
    <View style={vizStyles.eqRow}>
      {EQ_HEIGHTS.map((h, i) => (
        <View
          key={i}
          style={[
            vizStyles.eqBar,
            {
              height: 32 * h,
              opacity: 0.35 + h * 0.55,
              backgroundColor: C.primary,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ── Radiance rings for Light ──────────────────────────────────────────────────
const RING_SIZES = [56, 44, 30, 16];

function LightViz() {
  return (
    <View style={vizStyles.lightWrap}>
      {RING_SIZES.map((size, i) => (
        <View
          key={i}
          style={[
            vizStyles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: C.accent,
              opacity: 0.12 + i * 0.18,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ── Scattered dots for Crowds ─────────────────────────────────────────────────
// Pre-computed positions so dots feel hand-placed
const DOTS = [
  { x: 6, y: 4, s: 7 },
  { x: 22, y: 0, s: 6 },
  { x: 38, y: 6, s: 8 },
  { x: 14, y: 18, s: 6 },
  { x: 30, y: 14, s: 7 },
  { x: 46, y: 10, s: 5 },
  { x: 0, y: 28, s: 5 },
  { x: 20, y: 30, s: 8 },
  { x: 42, y: 26, s: 6 },
  { x: 10, y: 40, s: 7 },
  { x: 34, y: 38, s: 5 },
  { x: 50, y: 34, s: 6 },
];

function CrowdViz() {
  return (
    <View style={vizStyles.dotField}>
      {DOTS.map((d, i) => (
        <View
          key={i}
          style={[
            vizStyles.dot,
            {
              left: d.x,
              top: d.y,
              width: d.s,
              height: d.s,
              borderRadius: d.s / 2,
              opacity: 0.3 + (i % 3) * 0.2,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ── Sense data ────────────────────────────────────────────────────────────────
const SENSES = [
  {
    id: 'sound',
    label: 'Sound',
    range: 'Whisper-quiet  →  Concert-loud',
    color: C.primary,
    Viz: SoundViz,
  },
  {
    id: 'light',
    label: 'Light',
    range: 'Candlelit  →  Fluorescent',
    color: C.accent,
    Viz: LightViz,
  },
  {
    id: 'crowd',
    label: 'Crowd',
    range: 'Empty seat  →  Standing room',
    color: C.purple,
    Viz: CrowdViz,
  },
];

// ── Animation config ──────────────────────────────────────────────────────────
const ENTER = { damping: 20, stiffness: 120, mass: 0.85 };

export default function WhatIsSlide({ height, isActive }: Props) {
  // Header
  const hY = useSharedValue(28);
  const hOp = useSharedValue(0);
  // 3 sense rows
  const s0Y = useSharedValue(28);
  const s0Op = useSharedValue(0);
  const s1Y = useSharedValue(28);
  const s1Op = useSharedValue(0);
  const s2Y = useSharedValue(28);
  const s2Op = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      hY.value = withSpring(0, ENTER);
      hOp.value = withTiming(1, { duration: 350 });
      s0Y.value = withDelay(140, withSpring(0, ENTER));
      s0Op.value = withDelay(140, withTiming(1, { duration: 350 }));
      s1Y.value = withDelay(260, withSpring(0, ENTER));
      s1Op.value = withDelay(260, withTiming(1, { duration: 350 }));
      s2Y.value = withDelay(380, withSpring(0, ENTER));
      s2Op.value = withDelay(380, withTiming(1, { duration: 350 }));
    } else {
      hY.value = 28;
      hOp.value = 0;
      s0Y.value = 28;
      s0Op.value = 0;
      s1Y.value = 28;
      s1Op.value = 0;
      s2Y.value = 28;
      s2Op.value = 0;
    }
  }, [isActive]);

  const headerAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: hY.value }],
    opacity: hOp.value,
  }));
  const row0 = useAnimatedStyle(() => ({
    transform: [{ translateY: s0Y.value }],
    opacity: s0Op.value,
  }));
  const row1 = useAnimatedStyle(() => ({
    transform: [{ translateY: s1Y.value }],
    opacity: s1Op.value,
  }));
  const row2 = useAnimatedStyle(() => ({
    transform: [{ translateY: s2Y.value }],
    opacity: s2Op.value,
  }));
  const rowAnims = [row0, row1, row2];

  return (
    <View style={[styles.slide, { width: W, height }]}>
      <View style={styles.content}>
        {/* ── Header ── */}
        <Animated.View style={[styles.header, headerAnim]}>
          <Text style={styles.eyebrow}>We measure what maps don't</Text>
          <Text style={styles.heading}>{'Three senses.\nOne score.'}</Text>
        </Animated.View>

        {/* ── Sense rows ── */}
        <View style={styles.senses}>
          {SENSES.map((s, i) => {
            const Viz = s.Viz;
            return (
              <Animated.View key={s.id} style={[styles.senseRow, rowAnims[i]]}>
                {/* Viz illustration */}
                <View style={styles.vizBox}>
                  <Viz />
                </View>

                {/* Text column */}
                <View style={styles.senseText}>
                  <Text style={[styles.senseLabel, { color: s.color }]}>{s.label}</Text>
                  <View style={styles.rangeLine}>
                    <View style={[styles.rangeDot, { backgroundColor: s.color }]} />
                    <Text style={styles.rangeText}>{s.range}</Text>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>

        {/* ── Footer note ── */}
        <Animated.View style={headerAnim}>
          <Text style={styles.footer}>
            Rated 1–10 by real visitors. Combined into one overall score so you know what to expect.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ── Viz styles ────────────────────────────────────────────────────────────────
const vizStyles = StyleSheet.create({
  eqRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 32,
    gap: 2.5,
  },
  eqBar: {
    width: 3,
    borderRadius: 1.5,
  },
  lightWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  dotField: {
    width: 60,
    height: 52,
  },
  dot: {
    position: 'absolute',
    backgroundColor: C.purple,
  },
});

// ── Layout styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  slide: {
    backgroundColor: C.bg,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },

  // Header
  header: {
    marginBottom: 36,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
    letterSpacing: 0.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.8,
    lineHeight: 40,
  },

  // Sense rows
  senses: {
    gap: 0,
    marginBottom: 32,
  },
  senseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  vizBox: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  senseText: {
    flex: 1,
  },
  senseLabel: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  rangeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  rangeText: {
    fontSize: 13,
    color: C.textLight,
    letterSpacing: 0.2,
  },

  // Footer
  footer: {
    fontSize: 13,
    color: C.textDim,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
