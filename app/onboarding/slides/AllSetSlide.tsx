import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { C } from '../../../constants/onboarding';

const { width: W } = Dimensions.get('window');

interface Props {
  height: number;
  isActive: boolean;
  onComplete: () => void;
}

export default function AllSetSlide({ height, isActive, onComplete }: Props) {
  const hOp = useSharedValue(0);
  const hY = useSharedValue(24);
  const btnOp = useSharedValue(0);
  const btnY = useSharedValue(16);

  useEffect(() => {
    if (isActive) {
      hOp.value = withTiming(1, { duration: 450 });
      hY.value = withTiming(0, { duration: 450 });
      btnOp.value = withDelay(350, withTiming(1, { duration: 400 }));
      btnY.value = withDelay(350, withTiming(0, { duration: 400 }));
    } else {
      hOp.value = 0;
      hY.value = 24;
      btnOp.value = 0;
      btnY.value = 16;
    }
  }, [isActive]);

  const headerAnim = useAnimatedStyle(() => ({
    opacity: hOp.value,
    transform: [{ translateY: hY.value }],
  }));

  const btnAnim = useAnimatedStyle(() => ({
    opacity: btnOp.value,
    transform: [{ translateY: btnY.value }],
  }));

  return (
    <View style={[styles.slide, { width: W, height }]}>
      <View style={styles.content}>
        <Animated.View style={headerAnim}>
          <Text style={styles.eyebrow}>Ready</Text>
          <Text style={styles.heading}>{'You\'re\nall set.'}</Text>
          <Text style={styles.body}>
            {'The map is waiting. Tap any pin to see\nhow a place sounds, looks, and feels.'}
          </Text>
        </Animated.View>

        <Animated.View style={btnAnim}>
          <Pressable
            onPress={onComplete}
            accessibilityLabel="Start exploring SensoryScope"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cta,
              pressed && styles.ctaPressed,
            ]}
          >
            <Text style={styles.ctaText}>Start exploring</Text>
            <Text style={styles.ctaArrow}>→</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

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
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
    letterSpacing: 0.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 42,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -1,
    lineHeight: 48,
    marginBottom: 14,
  },
  body: {
    fontSize: 16,
    color: C.textLight,
    lineHeight: 25,
    marginBottom: 44,
  },

  // CTA — rectangular, not pill-shaped
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.primary,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  ctaPressed: {
    opacity: 0.88,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: C.white,
    letterSpacing: -0.2,
  },
  ctaArrow: {
    fontSize: 20,
    fontWeight: '400',
    color: C.white,
    opacity: 0.7,
  },
});
