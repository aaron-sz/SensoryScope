import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { C, SPRING_PRESS } from '../constants';

const { width: W } = Dimensions.get('window');

interface Props {
  height: number;
  isActive: boolean;
  onComplete: () => void;
}

export default function AllSetSlide({ height, isActive, onComplete }: Props) {
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);
  const btnOpacity = useSharedValue(0);
  const btnY = useSharedValue(20);
  const ring1 = useSharedValue(1);
  const ring2 = useSharedValue(1);
  const btnScale = useSharedValue(1);

  useEffect(() => {
    if (!isActive) return;
    // Staggered entrance — triggered when slide becomes visible
    checkScale.value = withSpring(1, { damping: 14, stiffness: 120 });
    checkOpacity.value = withTiming(1, { duration: 400 });

    titleOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    titleY.value = withDelay(300, withSpring(0, { damping: 16, stiffness: 120 }));

    btnOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    btnY.value = withDelay(600, withSpring(0, { damping: 16, stiffness: 120 }));

    // Ring pulse
    ring1.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1.4, { duration: 900, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 400, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
    ring2.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1.55, { duration: 1100, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 400, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [isActive]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ translateY: btnY.value }, { scale: btnScale.value }],
  }));
  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1.value }],
    opacity: (1.4 - ring1.value) * 0.35,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2.value }],
    opacity: (1.55 - ring2.value) * 0.25,
  }));

  function handleComplete() {
    btnScale.value = withSpring(0.96, SPRING_PRESS, () => {
      btnScale.value = withSpring(1, SPRING_PRESS);
    });
    setTimeout(onComplete, 150);
  }

  return (
    <View style={[styles.slide, { width: W, height }]}>
      <LinearGradient
        colors={[C.primaryPale, C.bg, C.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
      />

      {/* Confetti dots */}
      {CONFETTI.map((d, i) => (
        <View key={i} style={[styles.confettiDot, { left: d.x, top: d.y, backgroundColor: d.color }]} />
      ))}

      <View style={styles.content}>
        {/* Check icon with rings */}
        <View style={styles.checkWrap}>
          <Animated.View style={[styles.ring, styles.ring2, ring2Style]} />
          <Animated.View style={[styles.ring, styles.ring1, ring1Style]} />
          <Animated.View style={[styles.checkCircle, checkStyle]}>
            <Text style={styles.checkEmoji}>✅</Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.textBlock, titleStyle]}>
          <Text style={styles.heading}>You're all set!</Text>
          <Text style={styles.subheading}>
            {'Ready to find calm, sensory-friendly\nplaces around you.'}
          </Text>
        </Animated.View>

        <Animated.View style={btnStyle}>
          <Pressable
            onPressIn={() => { btnScale.value = withSpring(0.97, SPRING_PRESS); }}
            onPressOut={() => { btnScale.value = withSpring(1, SPRING_PRESS); }}
            onPress={handleComplete}
            accessibilityLabel="Start exploring SensoryScope"
            accessibilityRole="button"
          >
            <Animated.View style={styles.ctaBtn}>
              <Text style={styles.ctaBtnText}>Start Exploring  →</Text>
            </Animated.View>
          </Pressable>
        </Animated.View>

        {/* Feature pills */}
        <Animated.View style={[styles.pillsRow, titleStyle]}>
          {['🔊 Noise', '💡 Lighting', '👥 Crowds'].map((tag) => (
            <View key={tag} style={styles.pill}>
              <Text style={styles.pillText}>{tag}</Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const CONFETTI = [
  { x: W * 0.1, y: 80, color: C.accent },
  { x: W * 0.85, y: 100, color: C.primary },
  { x: W * 0.7, y: 60, color: C.accent },
  { x: W * 0.2, y: 130, color: C.purple },
  { x: W * 0.5, y: 50, color: C.primaryLight },
  { x: W * 0.9, y: 160, color: C.accent },
  { x: W * 0.05, y: 200, color: C.primary },
  { x: W * 0.75, y: 40, color: C.purple },
];

const styles = StyleSheet.create({
  slide: {
    overflow: 'hidden',
    backgroundColor: C.bg,
  },
  confettiDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.35,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 28,
  },
  checkWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: C.primary,
  },
  ring1: {
    width: 100,
    height: 100,
  },
  ring2: {
    width: 120,
    height: 120,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 16,
  },
  checkEmoji: {
    fontSize: 36,
  },
  textBlock: {
    alignItems: 'center',
  },
  heading: {
    fontSize: 34,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.7,
    marginBottom: 12,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 16,
    color: C.textLight,
    textAlign: 'center',
    lineHeight: 25,
  },
  ctaBtn: {
    backgroundColor: C.primary,
    paddingVertical: 18,
    paddingHorizontal: 56,
    borderRadius: 50,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.42,
    shadowRadius: 24,
    elevation: 14,
  },
  ctaBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: C.white,
    letterSpacing: 0.2,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    backgroundColor: C.primaryPale,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
  },
});
