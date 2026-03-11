/**
 * MapFilterBar — Horizontal scrollable category filter chips
 *
 * "All" chip clears filter; other chips filter map markers by Google Places category.
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { memo, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DarkColors, Radius, Spacing } from '../../constants/theme';

// ── Category definitions ──────────────────────────────────────────────────────
export type MapCategory = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Google Places type string — undefined means "All" */
  type?: string;
};

export const MAP_CATEGORIES: MapCategory[] = [
  { key: 'all', label: 'All', icon: 'globe-outline' },
  { key: 'restaurant', label: 'Food', icon: 'restaurant-outline', type: 'restaurant' },
  { key: 'cafe', label: 'Café', icon: 'cafe-outline', type: 'cafe' },
  { key: 'park', label: 'Parks', icon: 'leaf-outline', type: 'park' },
  { key: 'library', label: 'Library', icon: 'library-outline', type: 'library' },
  { key: 'shopping_mall', label: 'Shopping', icon: 'bag-outline', type: 'shopping_mall' },
  { key: 'gym', label: 'Gym', icon: 'barbell-outline', type: 'gym' },
  { key: 'bar', label: 'Bar', icon: 'wine-outline', type: 'bar' },
  { key: 'museum', label: 'Museum', icon: 'business-outline', type: 'museum' },
  { key: 'hospital', label: 'Hospital', icon: 'medkit-outline', type: 'hospital' },
  { key: 'supermarket', label: 'Grocery', icon: 'cart-outline', type: 'supermarket' },
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface MapFilterBarProps {
  activeKey: string;
  onChange: (key: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
const MapFilterBar = memo(function MapFilterBar({ activeKey, onChange }: MapFilterBarProps) {
  const handlePress = useCallback(
    (key: string) => {
      Haptics.selectionAsync();
      onChange(key);
    },
    [onChange],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
    >
      {MAP_CATEGORIES.map((cat) => (
        <CategoryChip
          key={cat.key}
          category={cat}
          isActive={activeKey === cat.key}
          onPress={handlePress}
        />
      ))}
    </ScrollView>
  );
});

export default MapFilterBar;

// ── CategoryChip ──────────────────────────────────────────────────────────────
interface ChipProps {
  category: MapCategory;
  isActive: boolean;
  onPress: (key: string) => void;
}

const CategoryChip = memo(function CategoryChip({ category, isActive, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={() => onPress(category.key)}
      style={({ pressed }) => [
        styles.chip,
        isActive ? styles.chipActive : styles.chipInactive,
        pressed && styles.chipPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`Filter by ${category.label}`}
    >
      <Ionicons
        name={category.icon}
        size={13}
        color={isActive ? '#FFFFFF' : DarkColors.textMuted}
      />
      <Text style={[styles.chipLabel, isActive ? styles.chipLabelActive : styles.chipLabelInactive]}>
        {category.label}
      </Text>
    </Pressable>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────
const ACCENT = '#10B981';

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  chipInactive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  chipLabelActive: {
    color: '#FFFFFF',
  },
  chipLabelInactive: {
    color: DarkColors.textMuted,
  },
});
