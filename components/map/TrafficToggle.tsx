/**
 * TrafficToggle — Floating button to enable/disable the traffic overlay.
 *
 * When traffic is ON:  glows red, car icon filled
 * When traffic is OFF: muted, car outline icon
 *
 * Placed as a floating button above the locate FAB.
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { memo, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

// Traffic active accent — a warm red that signals congestion
const TRAFFIC_RED = '#EF4444';
const TRAFFIC_RED_BG = 'rgba(239,68,68,0.18)';
const TRAFFIC_RED_BORDER = 'rgba(239,68,68,0.5)';
const MUTED_BG = 'rgba(255,255,255,0.08)';
const MUTED_BORDER = 'rgba(255,255,255,0.15)';

interface TrafficToggleProps {
  isActive: boolean;
  bottomOffset: number;
  onToggle: () => void;
}

const TrafficToggle = memo(function TrafficToggle({
  isActive,
  bottomOffset,
  onToggle,
}: TrafficToggleProps) {
  const scale = useSharedValue(1);

  // Bounce animation when toggled
  useEffect(() => {
    scale.value = withSequence(
      withSpring(isActive ? 1.15 : 0.9, { damping: 6, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 280 }),
    );
  }, [isActive, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggle();
  }, [onToggle]);

  return (
    <View style={[styles.outer, { bottom: bottomOffset }]}>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.btn,
            isActive ? styles.btnActive : styles.btnInactive,
            pressed && styles.btnPressed,
          ]}
          accessibilityLabel={isActive ? 'Hide traffic layer' : 'Show traffic layer'}
          accessibilityRole="button"
          accessibilityState={{ checked: isActive }}
        >
          <Ionicons
            name={isActive ? 'car' : 'car-outline'}
            size={22}
            color={isActive ? TRAFFIC_RED : 'rgba(255,255,255,0.7)'}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
});

export default TrafficToggle;

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  btn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 8,
  },
  btnActive: {
    backgroundColor: TRAFFIC_RED_BG,
    borderColor: TRAFFIC_RED_BORDER,
    shadowColor: TRAFFIC_RED,
    shadowOpacity: 0.4,
  },
  btnInactive: {
    backgroundColor: MUTED_BG,
    borderColor: MUTED_BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  btnPressed: {
    opacity: 0.75,
  },
});
