import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Location from 'expo-location';
import { C, SPRING_PRESS } from '../../../constants/onboarding';

const { width: W } = Dimensions.get('window');

interface Props {
  height: number;
  isActive: boolean;
}

export default function PermissionsSlide({ height, isActive }: Props) {
  const [status, setStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
  const btnScale = useSharedValue(1);
  const pingScale = useSharedValue(1);
  const contentY = useSharedValue(28);
  const contentOp = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      contentY.value = withSpring(0, { damping: 18, stiffness: 130 });
      contentOp.value = withTiming(1, { duration: 350 });
    } else {
      contentY.value = 28;
      contentOp.value = 0;
    }
  }, [isActive]);

  const contentAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentY.value }],
    opacity: contentOp.value,
  }));

  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  // Ping animation — only runs when slide is visible
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      pingScale.value = withSpring(1.18, { damping: 8, stiffness: 80 }, () => {
        pingScale.value = withSpring(1, { damping: 10, stiffness: 100 });
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isActive]);

  const pingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pingScale.value }],
    opacity: 2 - pingScale.value,
  }));

  async function handleGrant() {
    btnScale.value = withSpring(0.96, SPRING_PRESS, () => {
      btnScale.value = withSpring(1, SPRING_PRESS);
    });
    const { status: s } = await Location.requestForegroundPermissionsAsync();
    setStatus(s === 'granted' ? 'granted' : 'denied');
  }

  return (
    <View style={[styles.slide, { width: W, height }]}>
      {/* BG decoration */}
      <View style={styles.bgBlob} />

      <Animated.View style={[styles.content, contentAnimStyle]}>
        {/* Illustration */}
        <View style={styles.illustrationWrap}>
          <Animated.View style={[styles.pingRing, styles.pingRingOuter, pingStyle]} />
          <View style={styles.pingRing} />
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>📍</Text>
          </View>
        </View>

        <Text style={styles.heading}>
          {status === 'granted' ? 'Location enabled!' : 'Find places near you'}
        </Text>

        <Text style={styles.desc}>
          {status === 'granted'
            ? "You're all set. We'll show sensory-friendly places around you."
            : "We use your location to show sensory-friendly places nearby. Your location is never shared or stored."}
        </Text>

        {status === 'idle' && (
          <>
            <Pressable
              onPressIn={() => { btnScale.value = withSpring(0.96, SPRING_PRESS); }}
              onPressOut={() => { btnScale.value = withSpring(1, SPRING_PRESS); }}
              onPress={handleGrant}
              accessibilityLabel="Enable location access"
              accessibilityRole="button"
            >
              <Animated.View style={[styles.grantBtn, btnAnimStyle]}>
                <Text style={styles.grantBtnText}>📍  Enable Location</Text>
              </Animated.View>
            </Pressable>

            <Text style={styles.skipHint}>
              You can enable this later in settings
            </Text>
          </>
        )}

        {status === 'granted' && (
          <View style={styles.grantedBadge}>
            <Text style={styles.grantedText}>✓  Location access granted</Text>
          </View>
        )}

        {status === 'denied' && (
          <View style={styles.deniedNote}>
            <Text style={styles.deniedText}>
              No problem — you can enable location in your device settings anytime.
            </Text>
          </View>
        )}

        {/* Privacy note */}
        <View style={styles.privacyRow}>
          <Text style={styles.privacyIcon}>🔒</Text>
          <Text style={styles.privacyText}>Your location is private. We never sell your data.</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    backgroundColor: C.bg,
    overflow: 'hidden',
  },
  bgBlob: {
    position: 'absolute',
    bottom: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 9999,
    backgroundColor: C.primary,
    opacity: 0.05,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  pingRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: C.primary,
    opacity: 0.18,
  },
  pingRingOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.1,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 24,
    elevation: 14,
  },
  iconEmoji: {
    fontSize: 36,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 36,
    marginBottom: 14,
  },
  desc: {
    fontSize: 15,
    color: C.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  grantBtn: {
    backgroundColor: C.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 50,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 16,
  },
  grantBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.2,
  },
  skipHint: {
    fontSize: 13,
    color: C.textDim,
    textAlign: 'center',
    marginBottom: 24,
  },
  grantedBadge: {
    backgroundColor: C.primaryPale,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  grantedText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
  },
  deniedNote: {
    backgroundColor: C.accentPale,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  deniedText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 20,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  privacyIcon: {
    fontSize: 14,
  },
  privacyText: {
    fontSize: 12,
    color: C.textDim,
    flex: 1,
    lineHeight: 18,
  },
});
