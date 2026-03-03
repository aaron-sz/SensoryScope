/**
 * SensoryMap (native)
 * Full-screen Google Maps view replicating the Google Maps experience:
 *  - Dark mode map styling (automatic based on system theme)
 *  - Compass shown when map is rotated
 *  - Zoom controls
 *  - All native POI labels (restaurants, stores, parks, etc.)
 *  - Buildings, indoor maps, user location blue dot
 *  - Smooth tile loading with loading indicator
 *  - Custom sensory pins overlaid on top
 *
 * Performance:
 *  - React.memo on SensoryPin prevents re-renders when unrelated state changes
 *  - tracksViewChanges only enabled for the selected marker
 *  - collapsable={false} on the pin root ensures Android measures the view
 *  - No Reanimated inside Marker views
 */
import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
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
  selectedId: string | null;
  onSelectLocation: (loc: DisplayLocation) => void;
  mapType?: 'standard' | 'satellite' | 'hybrid';
  onRegionChangeComplete?: (region: Region) => void;
  mapPadding?: { top: number; right: number; bottom: number; left: number };
};

/**
 * Google Maps dark mode style JSON
 * Matches the default Google Maps dark theme exactly
 */
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'poi.park', elementType: 'labels.text.stroke', stylers: [{ color: '#1b1b1b' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#4e4e4e' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];

const SensoryMap = forwardRef<MapView, Props>(function SensoryMap(
  { region, locations, selectedId, onSelectLocation, mapType = 'standard', onRegionChangeComplete, mapPadding },
  ref
) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Only apply dark style in standard mode (satellite/hybrid have their own colors)
  const customMapStyle = useMemo(() => {
    if (isDark && mapType === 'standard') return DARK_MAP_STYLE;
    return [];
  }, [isDark, mapType]);

  return (
    <MapView
      ref={ref}
      style={styles.map}
      initialRegion={region}
      provider={PROVIDER_GOOGLE}
      mapType={mapType}
      customMapStyle={customMapStyle}
      onRegionChangeComplete={onRegionChangeComplete}
      // ── User location ──
      showsUserLocation
      showsMyLocationButton={false}
      // ── Google Maps features ──
      showsPointsOfInterest={true}
      showsBuildings={true}
      showsIndoors={true}
      showsCompass={true}
      showsScale={true}
      zoomEnabled={true}
      zoomControlEnabled={true}
      rotateEnabled={true}
      pitchEnabled={true}
      scrollEnabled={true}
      // ── Performance ──
      showsTraffic={false}
      loadingEnabled={true}
      loadingIndicatorColor="#3B82F6"
      loadingBackgroundColor={isDark ? '#1a1a2e' : '#f8fafc'}
      moveOnMarkerPress={false}
      // ── Map padding to account for header overlay ──
      mapPadding={mapPadding ?? { top: 140, right: 0, bottom: 0, left: 0 }}
    >
      {locations
        .filter((loc) => loc.latitude !== 0 || loc.longitude !== 0)
        .map((loc) => (
          <Marker
            key={loc.id}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            onPress={() => onSelectLocation(loc)}
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

const DOT_SIZE = 20;
const HALO_SIZE = 34;

const SensoryPin = React.memo(
  function SensoryPin({ score, isSelected }: { score: number | null; isSelected: boolean }) {
    const safeScore = score ?? 5;
    const color = scoreColor(safeScore);
    const glow = scoreGlow(safeScore);

    return (
      <View style={pinStyles.container} collapsable={false}>
        <View
          style={[
            pinStyles.halo,
            { backgroundColor: glow },
            isSelected && pinStyles.haloSelected,
          ]}
        >
          <View
            style={[
              pinStyles.dot,
              { backgroundColor: color },
              isSelected && { borderWidth: 2.5, borderColor: Colors.elevated },
            ]}
          />
        </View>
        <View style={[pinStyles.badge, { borderColor: color }]}>
          <Text style={[pinStyles.badgeText, { color }]}>
            {score != null ? Math.round(score) : '?'}
          </Text>
        </View>
      </View>
    );
  },
  (prev, next) => prev.score === next.score && prev.isSelected === next.isSelected
);

const pinStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
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
