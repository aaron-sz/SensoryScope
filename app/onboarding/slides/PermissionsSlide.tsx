import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import * as Location from 'expo-location';
import { C } from '../../../constants/onboarding';

const { width: W } = Dimensions.get('window');

interface Props {
  height: number;
  isActive: boolean;
}

export default function PermissionsSlide({ height, isActive }: Props) {
  const [status, setStatus] = useState<'idle' | 'granted' | 'denied'>('idle');

  const contentOp = useSharedValue(0);
  const contentY = useSharedValue(24);
  const btnOp = useSharedValue(0);
  const btnY = useSharedValue(16);

  useEffect(() => {
    if (isActive) {
      contentOp.value = withTiming(1, { duration: 400 });
      contentY.value = withTiming(0, { duration: 400 });
      btnOp.value = withDelay(250, withTiming(1, { duration: 350 }));
      btnY.value = withDelay(250, withTiming(0, { duration: 350 }));
    } else {
      contentOp.value = 0;
      contentY.value = 24;
      btnOp.value = 0;
      btnY.value = 16;
    }
  }, [isActive]);

  // Auto-prompt location when slide becomes active
  useEffect(() => {
    if (!isActive || status !== 'idle') return;
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const { status: s } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        setStatus(s === 'granted' ? 'granted' : 'denied');
      } catch {
        if (!cancelled) setStatus('denied');
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isActive, status]);

  const contentAnim = useAnimatedStyle(() => ({
    opacity: contentOp.value,
    transform: [{ translateY: contentY.value }],
  }));

  const btnAnim = useAnimatedStyle(() => ({
    opacity: btnOp.value,
    transform: [{ translateY: btnY.value }],
  }));

  async function handleRetry() {
    const { status: s } = await Location.requestForegroundPermissionsAsync();
    setStatus(s === 'granted' ? 'granted' : 'denied');
  }

  return (
    <View style={[styles.slide, { width: W, height }]}>
      <View style={styles.content}>
        <Animated.View style={contentAnim}>
          <Text style={styles.eyebrow}>Location</Text>
          <Text style={styles.heading}>
            {status === 'granted' ? 'You\'re on\nthe map.' : 'Find places\nnear you.'}
          </Text>
          <Text style={styles.body}>
            {status === 'granted'
              ? 'We\'ll show sensory-rated places around your current location.'
              : status === 'denied'
                ? 'No worries — you can enable location later in your device settings.'
                : 'We need your location to find nearby places. It\'s never stored or shared.'}
          </Text>
        </Animated.View>

        {/* Status indicator */}
        <Animated.View style={btnAnim}>
          {status === 'granted' && (
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: C.primary }]} />
              <Text style={[styles.statusText, { color: C.primary }]}>Location enabled</Text>
            </View>
          )}

          {status === 'denied' && (
            <Pressable onPress={handleRetry}>
              <View style={styles.retryBtn}>
                <Text style={styles.retryText}>Try again</Text>
              </View>
            </Pressable>
          )}

          {status === 'idle' && (
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: C.textDim }]} />
              <Text style={[styles.statusText, { color: C.textDim }]}>Requesting access…</Text>
            </View>
          )}
        </Animated.View>

        {/* Privacy note */}
        <Animated.View style={[styles.privacyWrap, contentAnim]}>
          <View style={styles.privacyLine} />
          <Text style={styles.privacyText}>
            Your location stays on your device. We never sell or share your data.
          </Text>
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
    fontSize: 32,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.8,
    lineHeight: 40,
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    color: C.textLight,
    lineHeight: 23,
    marginBottom: 32,
  },

  // Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 40,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Retry
  retryBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: C.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginBottom: 40,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.primary,
  },

  // Privacy
  privacyWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    paddingTop: 16,
  },
  privacyLine: {
    display: 'none',
  },
  privacyText: {
    fontSize: 13,
    color: C.textDim,
    lineHeight: 20,
  },
});
