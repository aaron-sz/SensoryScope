import React, { useEffect } from 'react';
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

const STEPS = [
  {
    id: 'search',
    num: '01',
    icon: '🔍',
    title: 'Search',
    desc: 'Find restaurants, parks, cafes, and more near you on the map.',
    color: C.primary,
    bg: C.primaryPale,
  },
  {
    id: 'read',
    num: '02',
    icon: '⭐',
    title: 'Read Ratings',
    desc: 'See real sensory scores for noise, lighting, and crowds from real visitors.',
    color: '#B45309',
    bg: C.accentPale,
  },
  {
    id: 'go',
    num: '03',
    icon: '✅',
    title: 'Go Confidently',
    desc: 'Visit knowing exactly what to expect — no surprises, just comfort.',
    color: C.purple,
    bg: C.purplePale,
  },
];

const ENTER = { damping: 18, stiffness: 130, mass: 0.9 };

export default function HowItWorksSlide({ height, isActive }: Props) {
  const headerY = useSharedValue(32);
  const headerOp = useSharedValue(0);
  const s0Y = useSharedValue(32);
  const s0Op = useSharedValue(0);
  const s1Y = useSharedValue(32);
  const s1Op = useSharedValue(0);
  const s2Y = useSharedValue(32);
  const s2Op = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      headerY.value = withSpring(0, ENTER);
      headerOp.value = withTiming(1, { duration: 320 });
      s0Y.value = withDelay(120, withSpring(0, ENTER));
      s0Op.value = withDelay(120, withTiming(1, { duration: 320 }));
      s1Y.value = withDelay(240, withSpring(0, ENTER));
      s1Op.value = withDelay(240, withTiming(1, { duration: 320 }));
      s2Y.value = withDelay(360, withSpring(0, ENTER));
      s2Op.value = withDelay(360, withTiming(1, { duration: 320 }));
    } else {
      headerY.value = 32;
      headerOp.value = 0;
      s0Y.value = 32;
      s0Op.value = 0;
      s1Y.value = 32;
      s1Op.value = 0;
      s2Y.value = 32;
      s2Op.value = 0;
    }
  }, [isActive]);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerY.value }],
    opacity: headerOp.value,
  }));
  const step0Style = useAnimatedStyle(() => ({
    transform: [{ translateY: s0Y.value }],
    opacity: s0Op.value,
  }));
  const step1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: s1Y.value }],
    opacity: s1Op.value,
  }));
  const step2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: s2Y.value }],
    opacity: s2Op.value,
  }));

  const stepStyles = [step0Style, step1Style, step2Style];

  return (
    <View style={[styles.slide, { width: W, height }]}>
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <View style={styles.content}>
        <Animated.View style={[styles.headerBlock, headerStyle]}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>HOW IT WORKS</Text>
            </View>
          </View>
          <Text style={styles.heading}>Three simple{'\n'}steps to calm</Text>
        </Animated.View>

        <View style={styles.steps}>
          {STEPS.map((step, i) => (
            <Animated.View key={step.id} style={stepStyles[i]}>
              <View style={styles.stepRow}>
                {/* Left: number + connector */}
                <View style={styles.leftCol}>
                  <View style={[styles.numCircle, { backgroundColor: step.bg, borderColor: step.color + '40' }]}>
                    <Text style={[styles.numText, { color: step.color }]}>{step.num}</Text>
                  </View>
                  {i < STEPS.length - 1 && <View style={styles.connector} />}
                </View>

                {/* Right: card */}
                <View style={styles.stepCard}>
                  <Text style={styles.stepIcon}>{step.icon}</Text>
                  <View style={styles.stepTextBlock}>
                    <Text style={[styles.stepTitle, { color: step.color }]}>{step.title}</Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
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
  decorCircle1: {
    position: 'absolute',
    width: W * 0.55,
    height: W * 0.55,
    borderRadius: 9999,
    backgroundColor: C.primary,
    opacity: 0.04,
    top: -W * 0.12,
    left: -W * 0.12,
  },
  decorCircle2: {
    position: 'absolute',
    width: W * 0.4,
    height: W * 0.4,
    borderRadius: 9999,
    backgroundColor: C.accent,
    opacity: 0.06,
    bottom: W * 0.05,
    right: -W * 0.1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 44,
    justifyContent: 'center',
  },
  headerBlock: {
    marginBottom: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: C.primaryPale,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 1.2,
  },
  heading: {
    fontSize: 30,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  steps: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  leftCol: {
    alignItems: 'center',
    width: 44,
  },
  numCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  connector: {
    width: 2,
    height: 22,
    backgroundColor: C.border,
    marginVertical: 3,
  },
  stepCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.card,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#3D4A5C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  stepIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  stepTextBlock: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  stepDesc: {
    fontSize: 13,
    color: C.textLight,
    lineHeight: 19,
  },
});
