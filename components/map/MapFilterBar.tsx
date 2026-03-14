/**
 * MapFilterBar — Horizontal scrollable category filter chips
 *
 * Solid themed background so the whole bar reads cleanly against the map.
 * Adapts to light / dark mode via useColors().
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { memo, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Radius, Shadows, Spacing, useColors } from '../../constants/theme';

// ── Category definitions ──────────────────────────────────────────────────────
export type MapCategory = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Google Places type string — undefined means "All" */
  type?: string;
};

export const MAP_CATEGORIES: MapCategory[] = [
  { key: 'all',            label: 'All',      icon: 'globe-outline'                          },
  { key: 'restaurant',    label: 'Food',     icon: 'restaurant-outline', type: 'restaurant'    },
  { key: 'cafe',          label: 'Café',     icon: 'cafe-outline',       type: 'cafe'          },
  { key: 'park',          label: 'Parks',    icon: 'leaf-outline',       type: 'park'          },
  { key: 'library',       label: 'Library',  icon: 'library-outline',    type: 'library'       },
  { key: 'shopping_mall', label: 'Shopping', icon: 'bag-outline',        type: 'shopping_mall' },
  { key: 'gym',           label: 'Gym',      icon: 'barbell-outline',    type: 'gym'           },
  { key: 'bar',           label: 'Bar',      icon: 'wine-outline',       type: 'bar'           },
  { key: 'museum',        label: 'Museum',   icon: 'business-outline',   type: 'museum'        },
  { key: 'hospital',      label: 'Hospital', icon: 'medkit-outline',     type: 'hospital'      },
  { key: 'supermarket',   label: 'Grocery',  icon: 'cart-outline',       type: 'supermarket'   },
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface MapFilterBarProps {
  activeKey: string;
  onChange: (key: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
const MapFilterBar = memo(function MapFilterBar({ activeKey, onChange }: MapFilterBarProps) {
  const C = useColors();

  const handlePress = useCallback(
    (key: string) => {
      Haptics.selectionAsync();
      onChange(key);
    },
    [onChange],
  );

  return (
    <View style={[styles.container, { backgroundColor: C.elevated, borderTopColor: C.border }]}>
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
    </View>
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
  const C = useColors();

  return (
    <Pressable
      onPress={() => onPress(category.key)}
      style={({ pressed }) => [
        styles.chip,
        isActive
          ? { backgroundColor: C.accent, borderColor: C.accent }
          : { backgroundColor: C.surface, borderColor: C.border },
        pressed && styles.chipPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`Filter by ${category.label}`}
    >
      <Ionicons
        name={category.icon}
        size={13}
        color={isActive ? '#FFFFFF' : C.accent}
      />
      <Text style={[
        styles.chipLabel,
        { color: isActive ? '#FFFFFF' : C.text },
      ]}>
        {category.label}
      </Text>
    </Pressable>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Shadows.card,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
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
  chipPressed: {
    opacity: 0.7,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
