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

const FEATURES = [
  {
    id: 'noise',
    icon: '🔊',
    title: 'Noise Levels',
    desc: 'From whisper-quiet cafes to lively bars — know the vibe before you arrive.',
    iconBg: C.primaryPale,
    iconColor: C.primary,
    accentBar: C.primary,
  },
  {
    id: 'lighting',
    icon: '💡',
    title: 'Lighting',
    desc: 'Bright, dim, warm, or natural — find spaces that match your comfort.',
    iconBg: C.accentPale,
    iconColor: '#B45309',
    accentBar: C.accent,
  },
  {
    id: 'crowds',
    icon: '👥',
    title: 'Crowd Density',
    desc: 'Cozy and calm or buzzing with energy — choose your crowd comfort level.',
    iconBg: C.purplePale,
    iconColor: C.purple,
    accentBar: C.purple,
  },
];

const ENTER = { damping: 18, stiffness: 130, mass: 0.9 };

export default function WhatIsSlide({ height, isActive }: Props) {
  const headerY = useSharedValue(32);
  const headerOp = useSharedValue(0);
  const c0Y = useSharedValue(32);
  const c0Op = useSharedValue(0);
  const c1Y = useSharedValue(32);
  const c1Op = useSharedValue(0);
  const c2Y = useSharedValue(32);
  const c2Op = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      headerY.value = withSpring(0, ENTER);
      headerOp.value = withTiming(1, { duration: 320 });
      c0Y.value = withDelay(110, withSpring(0, ENTER));
      c0Op.value = withDelay(110, withTiming(1, { duration: 320 }));
      c1Y.value = withDelay(210, withSpring(0, ENTER));
      c1Op.value = withDelay(210, withTiming(1, { duration: 320 }));
      c2Y.value = withDelay(310, withSpring(0, ENTER));
      c2Op.value = withDelay(310, withTiming(1, { duration: 320 }));
    } else {
      headerY.value = 32;
      headerOp.value = 0;
      c0Y.value = 32;
      c0Op.value = 0;
      c1Y.value = 32;
      c1Op.value = 0;
      c2Y.value = 32;
      c2Op.value = 0;
    }
  }, [isActive]);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerY.value }],
    opacity: headerOp.value,
  }));
  const card0Style = useAnimatedStyle(() => ({
    transform: [{ translateY: c0Y.value }],
    opacity: c0Op.value,
  }));
  const card1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: c1Y.value }],
    opacity: c1Op.value,
  }));
  const card2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: c2Y.value }],
    opacity: c2Op.value,
  }));

  const cardStyles = [card0Style, card1Style, card2Style];

  return (
    <View style={[styles.slide, { width: W, height }]}>
      <View style={styles.topStrip} />

      <View style={styles.content}>
        <Animated.View style={[styles.headerBlock, headerStyle]}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>FEATURES</Text>
            </View>
          </View>
          <Text style={styles.heading}>{'Your sensory\nguide to places'}</Text>
          <Text style={styles.subheading}>Every venue rated on what matters most.</Text>
        </Animated.View>

        <View style={styles.cards}>
          {FEATURES.map((f, i) => (
            <Animated.View key={f.id} style={[styles.card, cardStyles[i]]}>
              <View style={[styles.accentBar, { backgroundColor: f.accentBar }]} />
              <View style={[styles.iconCircle, { backgroundColor: f.iconBg }]}>
                <Text style={styles.cardIcon}>{f.icon}</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: f.iconColor }]}>{f.title}</Text>
                <Text style={styles.cardDesc}>{f.desc}</Text>
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
  topStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: C.primary,
    opacity: 0.15,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    justifyContent: 'center',
  },
  headerBlock: {
    marginBottom: 24,
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
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: C.textLight,
    lineHeight: 22,
  },
  cards: {
    gap: 12,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#3D4A5C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: C.border,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginLeft: 8,
    flexShrink: 0,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 13,
    color: C.textLight,
    lineHeight: 19,
  },
});
