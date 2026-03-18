import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
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
}

const STEPS = [
  {
    id: 'search',
    num: '1',
    verb: 'Open the map',
    detail: 'Places near you appear automatically, color-coded by their sensory score.',
    color: C.primary,
  },
  {
    id: 'read',
    num: '2',
    verb: 'Tap any pin',
    detail: 'See real ratings for sound, light, and crowds — submitted by visitors like you.',
    color: C.accent,
  },
  {
    id: 'go',
    num: '3',
    verb: 'Go prepared',
    detail: 'No surprises. You know exactly what the environment feels like before you arrive.',
    color: C.purple,
  },
];

export default function HowItWorksSlide({ height, isActive }: Props) {
  const hOp = useSharedValue(0);
  const hY = useSharedValue(24);
  const s0Op = useSharedValue(0);
  const s0Y = useSharedValue(24);
  const s1Op = useSharedValue(0);
  const s1Y = useSharedValue(24);
  const s2Op = useSharedValue(0);
  const s2Y = useSharedValue(24);

  useEffect(() => {
    if (isActive) {
      hOp.value = withTiming(1, { duration: 400 });
      hY.value = withTiming(0, { duration: 400 });
      s0Op.value = withDelay(160, withTiming(1, { duration: 400 }));
      s0Y.value = withDelay(160, withTiming(0, { duration: 400 }));
      s1Op.value = withDelay(300, withTiming(1, { duration: 400 }));
      s1Y.value = withDelay(300, withTiming(0, { duration: 400 }));
      s2Op.value = withDelay(440, withTiming(1, { duration: 400 }));
      s2Y.value = withDelay(440, withTiming(0, { duration: 400 }));
    } else {
      hOp.value = 0;
      hY.value = 24;
      s0Op.value = 0;
      s0Y.value = 24;
      s1Op.value = 0;
      s1Y.value = 24;
      s2Op.value = 0;
      s2Y.value = 24;
    }
  }, [isActive]);

  const headerAnim = useAnimatedStyle(() => ({
    opacity: hOp.value,
    transform: [{ translateY: hY.value }],
  }));
  const row0 = useAnimatedStyle(() => ({
    opacity: s0Op.value,
    transform: [{ translateY: s0Y.value }],
  }));
  const row1 = useAnimatedStyle(() => ({
    opacity: s1Op.value,
    transform: [{ translateY: s1Y.value }],
  }));
  const row2 = useAnimatedStyle(() => ({
    opacity: s2Op.value,
    transform: [{ translateY: s2Y.value }],
  }));
  const rowAnims = [row0, row1, row2];

  return (
    <View style={[styles.slide, { width: W, height }]}>
      <View style={styles.content}>
        {/* Header */}
        <Animated.View style={[styles.header, headerAnim]}>
          <Text style={styles.eyebrow}>How it works</Text>
          <Text style={styles.heading}>{'Three steps.\nZero surprises.'}</Text>
        </Animated.View>

        {/* Steps — timeline style */}
        <View style={styles.timeline}>
          {STEPS.map((step, i) => (
            <Animated.View key={step.id} style={[styles.stepRow, rowAnims[i]]}>
              {/* Number + connector line */}
              <View style={styles.numCol}>
                <Text style={[styles.stepNum, { color: step.color }]}>{step.num}</Text>
                {i < STEPS.length - 1 && (
                  <View style={styles.lineWrap}>
                    <View style={[styles.line, { backgroundColor: step.color, opacity: 0.18 }]} />
                  </View>
                )}
              </View>

              {/* Text */}
              <View style={styles.stepContent}>
                <Text style={[styles.stepVerb, { color: step.color }]}>{step.verb}</Text>
                <Text style={styles.stepDetail}>{step.detail}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
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

  // Timeline
  timeline: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  numCol: {
    width: 36,
    alignItems: 'center',
  },
  stepNum: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  lineWrap: {
    flex: 1,
    width: 1.5,
    alignItems: 'center',
    paddingVertical: 6,
  },
  line: {
    width: 1.5,
    flex: 1,
    borderRadius: 1,
  },
  stepContent: {
    flex: 1,
    paddingLeft: 14,
    paddingBottom: 28,
  },
  stepVerb: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  stepDetail: {
    fontSize: 14,
    color: C.textLight,
    lineHeight: 21,
  },
});
