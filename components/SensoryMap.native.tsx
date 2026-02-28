/**
 * SensoryMap (native)
 * Full-screen Google Maps view with color-coded sensory pins.
 *
 * Performance notes:
 *  - React.memo on SensoryPin prevents re-renders when unrelated state changes
 *  - tracksViewChanges only enabled for the selected marker (avoids full redraw on every frame)
 *  - collapsable={false} on the pin root ensures Android measures the view before capturing it
 *  - No Reanimated inside Marker views — it bypasses tracksViewChanges and causes map stutter
 */
import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors, scoreColor, scoreGlow } from '../constants/theme';
import { DisplayLocation } from './LocationModal';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type Props = {
  region: Region;
  locations: DisplayLocation[];
  selectedId: number | null;
  onSelectLocation: (loc: DisplayLocation) => void;
};

const SensoryMap = forwardRef<MapView, Props>(function SensoryMap(
  { region, locations, selectedId, onSelectLocation },
  ref
) {
  return (
    <MapView
      ref={ref}
      style={styles.map}
      initialRegion={region}
      showsUserLocation
      showsMyLocationButton={false}
      provider={PROVIDER_GOOGLE}
    >
      {locations
        // Skip locations with no coordinates (default 0,0 is Atlantic Ocean)
        .filter((loc) => loc.latitude !== 0 || loc.longitude !== 0)
        .map((loc) => (
          <Marker
            key={loc.id}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            onPress={() => onSelectLocation(loc)}
            // Only the selected marker re-captures its view; all others are static
            tracksViewChanges={loc.id === selectedId}
          >
            <SensoryPin score={loc.avg_sound} isSelected={loc.id === selectedId} />
          </Marker>
        ))}
    </MapView>
  );
});

export default SensoryMap;

/* ---------- Custom Pin ---------- */

const DOT_SIZE  = 20;
const HALO_SIZE = 34;

const SensoryPin = React.memo(
  function SensoryPin({ score, isSelected }: { score: number | null; isSelected: boolean }) {
    // Null-safe: locations with no reviews get a neutral amber score
    const safeScore = score ?? 5;
    const color = scoreColor(safeScore);
    const glow  = scoreGlow(safeScore);

    return (
      // collapsable={false} forces Android to measure this view before the map
      // captures it as a bitmap — prevents blank / invisible markers
      <View style={pinStyles.container} collapsable={false}>
        {/* Halo glow ring */}
        <View
          style={[
            pinStyles.halo,
            { backgroundColor: glow },
            isSelected && pinStyles.haloSelected,
          ]}
        >
          {/* Inner dot */}
          <View
            style={[
              pinStyles.dot,
              { backgroundColor: color },
              isSelected && { borderWidth: 2.5, borderColor: Colors.elevated },
            ]}
          />
        </View>

        {/* Score chip */}
        <View style={[pinStyles.badge, { borderColor: color }]}>
          <Text style={[pinStyles.badgeText, { color }]}>
            {score != null ? Math.round(score) : '?'}
          </Text>
        </View>
      </View>
    );
  },
  // Only re-render when the score or selection state actually changes
  (prev, next) => prev.score === next.score && prev.isSelected === next.isSelected
);

const pinStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    // Explicit minimum dimensions prevent zero-size capture on Android
    minWidth: HALO_SIZE,
    minHeight: HALO_SIZE + 20,
  },
  halo: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  haloSelected: {
    width: HALO_SIZE + 8,
    height: HALO_SIZE + 8,
    borderRadius: (HALO_SIZE + 8) / 2,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    elevation: 4,
  },
  badge: {
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: Colors.elevated,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
});

const styles = StyleSheet.create({
  map: { width: '100%', height: '100%' },
});
