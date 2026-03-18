/**
 * TrafficToggle — Floating button to enable/disable the traffic overlay.
 * Matches MapFAB style: simple teal circle with car icon.
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useColors } from '../../constants/theme';

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
  const C = useColors();

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  }, [onToggle]);

  return (
    <View style={[styles.outer, { bottom: bottomOffset }]}>
      <Pressable
        onPress={handlePress}
        hitSlop={8}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: isActive ? C.accent : C.surface,
            shadowColor: isActive ? C.accent : '#000',
          },
          pressed && styles.fabPressed,
        ]}
        accessibilityLabel={isActive ? 'Hide traffic layer' : 'Show traffic layer'}
        accessibilityRole="button"
        accessibilityState={{ checked: isActive }}
      >
        <Ionicons
          name="car"
          size={22}
          color={isActive ? '#FFFFFF' : C.textMuted}
        />
      </Pressable>
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
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  fabPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
