/**
 * MapHeader — Solid themed overlay header for the map screen.
 * Shows app name, place count / loading state, and a refresh button.
 * Adapts to light / dark mode via useColors().
 */
import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Radius, Spacing, useColors } from '../../constants/theme';
import MapFilterBar from './MapFilterBar';

interface MapHeaderProps {
  topInset: number;
  totalCount: number;
  ratedCount: number;
  loading: boolean;
  activeFilter: string;
  onFilterChange: (key: string) => void;
  onRefresh: () => void;
}

const MapHeader = memo(function MapHeader({
  topInset,
  totalCount,
  ratedCount,
  loading,
  activeFilter,
  onFilterChange,
  onRefresh,
}: MapHeaderProps) {
  const C = useColors();

  const subtitle = loading
    ? 'Finding places nearby…'
    : `${totalCount} places · ${ratedCount} rated`;

  return (
    <View style={[styles.outer, { paddingTop: topInset }]} pointerEvents="box-none">
      <View style={[styles.card, { backgroundColor: C.elevated, borderColor: C.border }]}>
        {/* Title row */}
        <View style={styles.titleRow} pointerEvents="box-none">
          <View style={styles.textBlock} pointerEvents="none">
            <Text style={[styles.title, { color: C.text }]}>SensoryScope</Text>
            <Text style={[styles.subtitle, { color: C.textMuted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <Pressable
            onPress={onRefresh}
            style={[styles.refreshBtn, { backgroundColor: C.accentGlow }]}
            hitSlop={12}
            accessibilityLabel="Refresh places"
          >
            <Ionicons name="refresh" size={18} color={C.accent} />
          </Pressable>
        </View>

        {/* Filter bar */}
        <MapFilterBar activeKey={activeFilter} onChange={onFilterChange} />
      </View>
    </View>
  );
});

export default MapHeader;

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    // Subtle shadow so the card lifts off the map
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm + 2,
    paddingBottom: 6,
    gap: Spacing.sm,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
