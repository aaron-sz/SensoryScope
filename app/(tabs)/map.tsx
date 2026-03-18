/**
 * Map Screen — Safe wrapper
 *
 * @rnmapbox/maps crashes at import time in Expo Go because native modules
 * aren't linked. This wrapper catches that and shows a friendly fallback
 * so the app still runs. The full map works in dev builds & production.
 */
import Constants from 'expo-constants';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../constants/theme';

const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// Conditionally require the full map — skipped entirely in Expo Go
let MapScreenContent: React.ComponentType | null = null;
if (!IS_EXPO_GO) {
  try {
    MapScreenContent = require('../../components/map/MapScreenContent').default;
  } catch {
    // Native module not linked — will show fallback
  }
}

export default function MapScreen() {
  if (MapScreenContent) {
    return <MapScreenContent />;
  }
  return <MapFallback />;
}

function MapFallback() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.fallback, { backgroundColor: C.bg, paddingTop: insets.top + 60 }]}>
      <View style={[styles.iconWrap, { backgroundColor: C.surface }]}>
        <Ionicons name="map-outline" size={48} color={C.textDim} />
      </View>
      <Text style={[styles.title, { color: C.text }]}>Map Unavailable</Text>
      <Text style={[styles.body, { color: C.textMuted }]}>
        The interactive map requires a custom development build.{'\n\n'}
        Run <Text style={{ fontWeight: '700', color: C.text }}>npx expo run:ios</Text> or{' '}
        <Text style={{ fontWeight: '700', color: C.text }}>npx expo run:android</Text> to
        build with native modules linked.
      </Text>
      <View style={[styles.badge, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Ionicons name="information-circle-outline" size={16} color={C.accent} />
        <Text style={[styles.badgeText, { color: C.textMuted }]}>
          All other tabs work normally in Expo Go
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
