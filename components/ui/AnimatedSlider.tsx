/**
 * AnimatedSlider
 * A fully custom slider built with Reanimated + GestureHandler.
 * Features: gradient track fill, animated thumb with press-scale,
 * live value display, haptic tick feedback.
 */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Radius, Spacing } from '../../constants/theme';

const THUMB_SIZE = 26;
const TRACK_HEIGHT = 6;

type Props = {
  label: string;
  value: number;
  onValueChange: (val: number) => void;
  min?: number;
  max?: number;
  leftLabel: string;
  rightLabel: string;
  /** Gradient colors for the filled portion of the track (left→right) */
  gradientColors: readonly [string, string, ...string[]];
};

export default function AnimatedSlider({
  label,
  value,
  onValueChange,
  min = 1,
  max = 10,
  leftLabel,
  rightLabel,
  gradientColors,
}: Props) {
  const trackWidth = useSharedValue(0);
  const thumbX = useSharedValue(0);
  const thumbScale = useSharedValue(1);
  const lastHapticValue = useSharedValue(value);

  /** Convert a raw value to a pixel offset for the thumb */
  const valueToX = useCallback(
    (v: number, width: number) =>
      ((v - min) / (max - min)) * (width - THUMB_SIZE),
    [min, max]
  );

  /** Convert a pixel offset to a snapped integer value */
  const xToValue = useCallback(
    (x: number, width: number) =>
      Math.round((x / (width - THUMB_SIZE)) * (max - min) + min),
    [min, max]
  );

  // Sync thumb position whenever the external value prop changes.
  // `trackWidth` is a stable shared-value ref — read .value inside the effect,
  // never put .value in the dependency array (that reads it during render and
  // triggers the Reanimated strict-mode warning).
  useEffect(() => {
    if (trackWidth.value > 0) {
      thumbX.value = withSpring(valueToX(value, trackWidth.value), {
        damping: 20,
        stiffness: 250,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]); // trackWidth / thumbX are stable refs, not deps

  const fireHaptic = () => Haptics.selectionAsync();

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      thumbScale.value = withSpring(1.35, { damping: 15, stiffness: 300 });
    })
    .onChange((e) => {
      'worklet';
      if (trackWidth.value === 0) return;

      // Clamp within track bounds
      const newX = Math.max(
        0,
        Math.min(thumbX.value + e.changeX, trackWidth.value - THUMB_SIZE)
      );
      thumbX.value = newX;

      const newValue = xToValue(newX, trackWidth.value);

      // Fire haptic only when the integer value changes
      if (newValue !== lastHapticValue.value) {
        lastHapticValue.value = newValue;
        runOnJS(fireHaptic)();
        runOnJS(onValueChange)(newValue);
      }
    })
    .onEnd(() => {
      'worklet';
      thumbScale.value = withSpring(1, { damping: 20, stiffness: 300 });
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: thumbX.value },
      { scale: thumbScale.value },
    ],
  }));

  // The filled track width = thumb center
  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value + THUMB_SIZE / 2,
  }));

  return (
    <View style={styles.wrapper}>
      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valuePill}>
          <Text style={styles.valueText}>{value}</Text>
        </View>
      </View>

      {/* Track + Thumb */}
      <View
        style={styles.trackContainer}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          trackWidth.value = w;
          thumbX.value = valueToX(value, w);
        }}
      >
        {/* Background track */}
        <View style={styles.trackBg} />

        {/* Gradient fill */}
        <Animated.View style={[styles.trackFillMask, fillStyle]}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Draggable thumb */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </GestureDetector>
      </View>

      {/* Scale labels */}
      <View style={styles.scaleRow}>
        <Text style={styles.scaleLabel}>{leftLabel}</Text>
        <Text style={styles.scaleLabel}>{rightLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm + 2,
  },
  label: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  valuePill: {
    backgroundColor: Colors.elevated,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 2,
    minWidth: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  valueText: {
    color: Colors.primaryLight,
    fontSize: 14,
    fontWeight: '700',
  },
  trackContainer: {
    height: THUMB_SIZE,
    justifyContent: 'center',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TRACK_HEIGHT,
    backgroundColor: Colors.elevated,
    borderRadius: Radius.pill,
  },
  trackFillMask: {
    position: 'absolute',
    left: 0,
    height: TRACK_HEIGHT,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Colors.text,
    borderWidth: 3,
    borderColor: Colors.primaryLight,
    // Glow on Android
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  scaleLabel: {
    color: Colors.textDim,
    fontSize: 11,
    fontWeight: '500',
  },
});
