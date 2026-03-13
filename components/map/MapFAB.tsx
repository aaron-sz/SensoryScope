/**
 * MapFAB — Floating action button for snapping camera back to the user's location.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useColors } from '../../constants/theme';

interface MapFABProps {
  bottomOffset: number;
  onPress: () => void;
  disabled?: boolean;
}

const MapFAB = memo(function MapFAB({ bottomOffset, onPress, disabled = false }: MapFABProps) {
  const C = useColors();
  return (
    <View style={[styles.outer, { bottom: bottomOffset }]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        hitSlop={8}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: C.accent, shadowColor: C.accent },
          pressed && styles.fabPressed,
          disabled && styles.fabDisabled,
        ]}
        accessibilityLabel="Go to my location"
        accessibilityRole="button"
      >
        <Ionicons name="locate" size={22} color="#FFFFFF" />
      </Pressable>
    </View>
  );
});

export default MapFAB;

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
  fabDisabled: {
    opacity: 0.4,
  },
});
