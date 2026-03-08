import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from '../constants';

const { width: W } = Dimensions.get('window');

interface Props {
  height: number;
  isActive: boolean;
}

export default function WelcomeSlide({ height, isActive }: Props) {
  const s1 = useSharedValue(1);
  const s2 = useSharedValue(1);
  const o1 = useSharedValue(0.09);
  const o2 = useSharedValue(0.06);
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    if (!isActive) return;
    // Entrance animation
    logoScale.value = withSpring(1, { damping: 16, stiffness: 120 });
    logoOpacity.value = withTiming(1, { duration: 600 });

    // Background pulsing
    s1.value = withRepeat(
      withTiming(1.22, { duration: 4800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    s2.value = withRepeat(
      withTiming(1.16, { duration: 6200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    o1.value = withRepeat(
      withTiming(0.15, { duration: 4800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    o2.value = withRepeat(
      withTiming(0.11, { duration: 6200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [isActive]);

  const circle1Style = useAnimatedStyle(() => ({
    transform: [{ scale: s1.value }],
    opacity: o1.value,
  }));
  const circle2Style = useAnimatedStyle(() => ({
    transform: [{ scale: s2.value }],
    opacity: o2.value,
  }));
  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  return (
    <View style={[styles.slide, { width: W, height }]}>
      {/* Animated background orbs */}
      <Animated.View style={[styles.orb, styles.orb1, circle1Style]} />
      <Animated.View style={[styles.orb, styles.orb2, circle2Style]} />

      {/* Content */}
      <Animated.View style={[styles.content, logoAnimStyle]}>
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🌿</Text>
        </View>

        <Text style={styles.appName}>SensoryScope</Text>
        <Text style={styles.tagline}>{'Find your calm\nin the world'}</Text>
        <Text style={styles.desc}>
          {'Discover places rated for noise,\nlighting & crowd comfort.'}
        </Text>
      </Animated.View>

      {/* Bottom fade */}
      <LinearGradient
        colors={['transparent', C.bg]}
        style={[styles.bottomFade, { height: height * 0.2 }]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orb1: {
    width: W * 0.88,
    height: W * 0.88,
    top: -W * 0.18,
    right: -W * 0.22,
    backgroundColor: C.primary,
  },
  orb2: {
    width: W * 0.72,
    height: W * 0.72,
    bottom: W * 0.04,
    left: -W * 0.28,
    backgroundColor: C.accent,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 36,
    zIndex: 1,
  },
  logoBox: {
    width: 92,
    height: 92,
    borderRadius: 26,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.42,
    shadowRadius: 28,
    elevation: 16,
  },
  logoEmoji: {
    fontSize: 42,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: -0.8,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 30,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  desc: {
    fontSize: 16,
    color: C.textLight,
    textAlign: 'center',
    lineHeight: 26,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
