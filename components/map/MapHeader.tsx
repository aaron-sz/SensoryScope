/**
 * MapHeader — Blurred overlay header for the map screen.
 * Shows app name, place count / loading state, and a refresh button.
 */
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Spacing } from '../../constants/theme';
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

const ACCENT = '#10B981';

const MapHeader = memo(function MapHeader({
  topInset,
  totalCount,
  ratedCount,
  loading,
  activeFilter,
  onFilterChange,
  onRefresh,
}: MapHeaderProps) {
  const subtitle = loading
    ? 'Finding places nearby…'
    : `${totalCount} places · ${ratedCount} rated`;

  return (
    <View style={[styles.outer, { paddingTop: topInset }]} pointerEvents="box-none">
      <BlurView intensity={75} tint="dark" style={styles.blur}>
        {/* Title row */}
        <View style={styles.titleRow} pointerEvents="box-none">
          <View style={styles.textBlock} pointerEvents="none">
            <Text style={styles.title}>SensoryScope</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <Pressable
            onPress={onRefresh}
            style={styles.refreshBtn}
            hitSlop={12}
            accessibilityLabel="Refresh places"
          >
            <Ionicons name="refresh" size={18} color={ACCENT} />
          </Pressable>
        </View>

        {/* Filter bar */}
        <MapFilterBar activeKey={activeFilter} onChange={onFilterChange} />
        <View style={styles.filterSpacer} />
      </BlurView>
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
  },
  blur: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 6,
    gap: Spacing.sm,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16,185,129,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSpacer: {
    height: 4,
  },
});
