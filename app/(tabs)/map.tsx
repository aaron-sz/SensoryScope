/**
 * Map Screen — SensoryScope
 *
 * Full-screen Mapbox dark map showing sensory-rated locations as custom
 * GeoJSON circle markers. Tapping a pin opens the LocationModal bottom sheet.
 *
 * Architecture:
 *  - ShapeSource + CircleLayer + SymbolLayer for high-performance markers
 *  - Camera ref for programmatic flyTo animations
 *  - BlurView header overlay showing location count + refresh
 *  - Legend card and FAB floating above the tab bar
 *  - useMapLocations hook fetches from Supabase
 */
import MapboxGL, {
  Camera,
  CircleLayer,
  type CircleLayerStyle,
  MapView,
  ShapeSource,
  SymbolLayer,
  type SymbolLayerStyle,
  UserLocation,
} from '@rnmapbox/maps';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import type { FeatureCollection, Feature, Point, GeoJsonProperties } from 'geojson';

// OnPressEvent is not exported from @rnmapbox/maps — define it inline
type OnPressEvent = {
  features: Array<GeoJSON.Feature>;
  coordinates: { latitude: number; longitude: number };
  point: { x: number; y: number };
};
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LocationModal, { DisplayLocation } from '../../components/LocationModal';
import { useMapLocations } from '../../hooks/useMapLocations';

// ── Mapbox init (must be outside component) ─────────────────────────────────
MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

// ── Constants ────────────────────────────────────────────────────────────────
const US_CENTER: [number, number] = [-98.5795, 39.8283];
const DEFAULT_ZOOM = 4;
const SELECTED_ZOOM = 15;
const TAB_BAR_HEIGHT = 90;

const CALM_COLOR = '#3ab98f';
const MODERATE_COLOR = '#ce9b43';
const INTENSE_COLOR = '#d74c64';
const ACCENT_COLOR = '#10B981';
const DARK_BG = '#080F1E';

function getScoreColor(score: number | null): string {
  if (score === null) return '#64748B';
  if (score <= 3) return CALM_COLOR;
  if (score <= 6) return MODERATE_COLOR;
  return INTENSE_COLOR;
}

// ── GeoJSON feature properties type ─────────────────────────────────────────
type MarkerProps = {
  id: string;
  name: string;
  scoreColorValue: string;
  scoreText: string;
  isSelected: 0 | 1;
};

type MarkerFeature = Feature<Point, MarkerProps>;
type MarkerCollection = FeatureCollection<Point, MarkerProps>;

// ── Layer styles (defined outside component for referential stability) ───────
// Expressions cast through unknown to satisfy Value<T, ...> = T | Expression
const glowStyle: CircleLayerStyle = {
  circleColor: ['get', 'scoreColorValue'] as unknown as string,
  circleRadius: ['case', ['==', ['get', 'isSelected'], 1], 36, 24] as unknown as number,
  circleOpacity: 0.2,
  circleBlur: 0.8,
};

const mainCircleStyle: CircleLayerStyle = {
  circleColor: ['get', 'scoreColorValue'] as unknown as string,
  circleRadius: ['case', ['==', ['get', 'isSelected'], 1], 20, 14] as unknown as number,
  circleStrokeWidth: ['case', ['==', ['get', 'isSelected'], 1], 3, 2] as unknown as number,
  circleStrokeColor: '#FFFFFF',
  circleStrokeOpacity: ['case', ['==', ['get', 'isSelected'], 1], 1, 0.55] as unknown as number,
};

const scoreLabelStyle: SymbolLayerStyle = {
  textField: ['get', 'scoreText'] as unknown as string,
  textColor: '#FFFFFF',
  textSize: 10,
  textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
  textAllowOverlap: true,
  textIgnorePlacement: true,
};

const nameLabelStyle: SymbolLayerStyle = {
  textField: ['get', 'name'] as unknown as string,
  textColor: 'rgba(255,255,255,0.75)',
  textSize: 10,
  textOffset: [0, 2.4] as [number, number],
  textOptional: true,
  textMaxWidth: 10,
  textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
};

// ── Main Component ───────────────────────────────────────────────────────────
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Camera>(null);

  const { locations, loading, error, refetch } = useMapLocations();

  const [selectedLocation, setSelectedLocation] = useState<DisplayLocation | null>(null);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);

  // ── Request location permission & fly to user on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') return;

      setLocationGranted(true);

      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        const coords: [number, number] = [loc.coords.longitude, loc.coords.latitude];
        setUserCoords(coords);

        cameraRef.current?.setCamera({
          centerCoordinate: coords,
          zoomLevel: 13,
          animationMode: 'flyTo',
          animationDuration: 1200,
        });
      } catch {
        // Use default center if location unavailable
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Build GeoJSON FeatureCollection ──────────────────────────────────────
  const geoJSON = useMemo<MarkerCollection>(() => {
    const features: MarkerFeature[] = locations.map((loc) => {
      const color = getScoreColor(loc.avg_sound);
      const scoreText = loc.avg_sound != null ? String(Math.round(loc.avg_sound)) : '?';
      const props: MarkerProps = {
        id: loc.id,
        name: loc.name,
        scoreColorValue: color,
        scoreText,
        isSelected: selectedLocation?.id === loc.id ? 1 : 0,
      };
      return {
        type: 'Feature' as const,
        id: loc.id,
        geometry: {
          type: 'Point' as const,
          coordinates: [loc.longitude, loc.latitude],
        },
        properties: props,
      };
    });
    return { type: 'FeatureCollection' as const, features };
  }, [locations, selectedLocation?.id]);

  // ── Handle marker tap ───────────────────────────────────────────────────
  const handleMarkerPress = useCallback(
    (event: OnPressEvent) => {
      const feature = event.features[0];
      if (!feature?.properties) return;

      const id = (feature.properties as GeoJsonProperties & { id?: string }).id;
      if (!id) return;

      const found = locations.find((l) => l.id === id);
      if (!found) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedLocation(found);

      cameraRef.current?.setCamera({
        centerCoordinate: [found.longitude, found.latitude],
        zoomLevel: SELECTED_ZOOM,
        animationMode: 'flyTo',
        animationDuration: 800,
        pitch: 40,
      });
    },
    [locations],
  );

  const handleClose = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  const flyToUser = useCallback(() => {
    if (!userCoords) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cameraRef.current?.setCamera({
      centerCoordinate: userCoords,
      zoomLevel: 14,
      animationMode: 'flyTo',
      animationDuration: 900,
    });
  }, [userCoords]);

  const headerPaddingTop = insets.top + 6;

  return (
    <View style={styles.container}>
      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/dark-v11"
        scaleBarEnabled={false}
        attributionEnabled={false}
        logoEnabled={false}
        compassEnabled
        compassPosition={{ top: headerPaddingTop + 80, right: 16 }}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: US_CENTER,
            zoomLevel: DEFAULT_ZOOM,
          }}
        />

        {locationGranted && <UserLocation visible animated />}

        {locations.length > 0 && (
          <ShapeSource
            id="sensory-locations"
            shape={geoJSON}
            onPress={handleMarkerPress}
            hitbox={{ width: 44, height: 44 }}
          >
            {/* Outer ambient glow */}
            <CircleLayer id="glow-layer" style={glowStyle} />
            {/* Main solid dot */}
            <CircleLayer id="main-circle" style={mainCircleStyle} />
            {/* Score number centered on dot */}
            <SymbolLayer id="score-label" style={scoreLabelStyle} />
            {/* Place name below dot */}
            <SymbolLayer id="name-label" style={nameLabelStyle} />
          </ShapeSource>
        )}
      </MapView>

      {/* ── Header Overlay ──────────────────────────────────────────────── */}
      <View
        style={[styles.headerOuter, { paddingTop: insets.top }]}
        pointerEvents="box-none"
      >
        <BlurView intensity={70} tint="dark" style={styles.headerBlur}>
          <View style={styles.headerRow} pointerEvents="box-none">
            <View style={styles.headerText} pointerEvents="none">
              <Text style={styles.headerTitle}>SensoryScope</Text>
              <Text style={styles.headerSub}>
                {loading
                  ? 'Loading sensory data...'
                  : `${locations.length} rated place${locations.length !== 1 ? 's' : ''} nearby`}
              </Text>
            </View>
            <Pressable onPress={refetch} style={styles.refreshBtn} hitSlop={12}>
              <Ionicons name="refresh" size={18} color={ACCENT_COLOR} />
            </Pressable>
          </View>
        </BlurView>
      </View>

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <View
        style={[styles.legendOuter, { bottom: TAB_BAR_HEIGHT + 12 }]}
        pointerEvents="none"
      >
        <BlurView intensity={55} tint="dark" style={styles.legendBlur}>
          <LegendRow color={CALM_COLOR} label="Calm" range="1–3" />
          <LegendRow color={MODERATE_COLOR} label="Moderate" range="4–6" />
          <LegendRow color={INTENSE_COLOR} label="Intense" range="7–10" />
        </BlurView>
      </View>

      {/* ── FAB — My Location ───────────────────────────────────────────── */}
      <View style={[styles.fabOuter, { bottom: TAB_BAR_HEIGHT + 12 }]}>
        <Pressable onPress={flyToUser} style={styles.fab} hitSlop={8}>
          <Ionicons name="locate" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* ── Loading overlay ─────────────────────────────────────────────── */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={ACCENT_COLOR} />
          <Text style={styles.loadingText}>Loading sensory data...</Text>
        </View>
      )}

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error != null && !loading && (
        <View style={[styles.errorBanner, { top: insets.top + 90 }]}>
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
          <Pressable onPress={refetch} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* ── Location Modal ──────────────────────────────────────────────── */}
      {selectedLocation != null && (
        <LocationModal location={selectedLocation} onClose={handleClose} />
      )}
    </View>
  );
}

// ── Legend Row ───────────────────────────────────────────────────────────────
const LegendRow = React.memo(function LegendRow({
  color,
  label,
  range,
}: {
  color: string;
  label: string;
  range: string;
}) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendRange}>{range}</Text>
    </View>
  );
});

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  map: {
    flex: 1,
  },

  // Header
  headerOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerBlur: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 8,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: -0.4,
  },
  headerSub: {
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

  // Legend
  legendOuter: {
    position: 'absolute',
    left: 14,
    zIndex: 10,
  },
  legendBlur: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 3,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  legendRange: {
    fontSize: 10,
    color: '#94A3B8',
  },

  // FAB
  fabOuter: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: ACCENT_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,15,30,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    zIndex: 20,
  },
  loadingText: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '600',
  },

  // Error
  errorBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(244,63,94,0.92)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 20,
  },
  errorText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
