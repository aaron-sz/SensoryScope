/**
 * Map Screen — SensoryScope
 *
 * Full-screen Mapbox dark map showing ALL nearby places as custom markers.
 * Rated places (with sensory data) show colored score markers.
 * Unrated places show neutral grey markers.
 * A toggleable real-time traffic overlay shows road congestion.
 *
 * Architecture:
 *  - useNearbyPlaces   : unified data hook (Google Places + Supabase merge)
 *  - useMapCamera      : camera flyTo helpers
 *  - ShapeSource + CircleLayer + SymbolLayer: high-performance GeoJSON markers
 *  - TrafficLayer      : Mapbox traffic vector tileset with fade animation
 *  - MapHeader         : blurred overlay + filter chip bar
 *  - MapLegend         : floating sensory color key (responsive)
 *  - TrafficLegend     : floating traffic gradient key (responsive)
 *  - TrafficToggle     : traffic on/off FAB with spring bounce
 *  - MapFAB            : locate-me button
 *  - LocationModal     : bottom sheet with sensory + busyness details
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
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Point,
} from 'geojson';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LocationModal, { DisplayLocation } from '../../components/LocationModal';
import MapFAB from '../../components/map/MapFAB';
import MapHeader from '../../components/map/MapHeader';
import MapLegend from '../../components/map/MapLegend';
import TrafficLayer from '../../components/map/TrafficLayer';
import TrafficLegend from '../../components/map/TrafficLegend';
import TrafficToggle from '../../components/map/TrafficToggle';
import { MAP_CATEGORIES } from '../../components/map/MapFilterBar';
import { DarkColors } from '../../constants/theme';
import { useMapCamera } from '../../hooks/useMapCamera';
import { useNearbyPlaces, type MapPlace } from '../../hooks/useNearbyPlaces';

// ── Mapbox init ───────────────────────────────────────────────────────────────
MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

// ── OnPressEvent (not exported from @rnmapbox/maps) ──────────────────────────
type OnPressEvent = {
  features: Array<GeoJSON.Feature>;
  coordinates: { latitude: number; longitude: number };
  point: { x: number; y: number };
};

// ── GeoJSON feature property shape ────────────────────────────────────────────
interface MarkerProps {
  id: string;
  name: string;
  isRated: 0 | 1;
  scoreColorValue: string;
  scoreText: string;
  isSelected: 0 | 1;
  category: string;
}

type MarkerFeature = Feature<Point, MarkerProps>;
type MarkerCollection = FeatureCollection<Point, MarkerProps>;

// ── Score color helpers ───────────────────────────────────────────────────────
function overallScore(place: MapPlace): number | null {
  if (place.avg_sound == null && place.avg_light == null && place.avg_crowd == null) return null;
  const vals = [place.avg_sound, place.avg_light, place.avg_crowd].filter(
    (v): v is number => v != null,
  );
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function scoreToColor(score: number | null): string {
  if (score === null) return '#4A5568';
  if (score <= 3) return DarkColors.calm;
  if (score <= 6) return DarkColors.moderate;
  return DarkColors.intense;
}

// ── Layer styles (module-level for referential stability) ─────────────────────

const glowStyle: CircleLayerStyle = {
  circleColor: ['get', 'scoreColorValue'] as unknown as string,
  circleRadius: ['case', ['==', ['get', 'isSelected'], 1], 38, 0] as unknown as number,
  circleOpacity: 0.22,
  circleBlur: 0.9,
};

const mainCircleStyle: CircleLayerStyle = {
  circleColor: [
    'case',
    ['==', ['get', 'isRated'], 1],
    ['get', 'scoreColorValue'],
    '#4A5568',
  ] as unknown as string,
  circleOpacity: [
    'case', ['==', ['get', 'isRated'], 0], 0.55, 1,
  ] as unknown as number,
  circleRadius: ['case', ['==', ['get', 'isSelected'], 1], 20, 14] as unknown as number,
  circleStrokeWidth: ['case', ['==', ['get', 'isSelected'], 1], 3, 1.5] as unknown as number,
  circleStrokeColor: '#FFFFFF',
  circleStrokeOpacity: [
    'case',
    ['==', ['get', 'isSelected'], 1], 1,
    ['==', ['get', 'isRated'], 1], 0.6,
    0.3,
  ] as unknown as number,
};

const scoreLabelStyle: SymbolLayerStyle = {
  textField: ['get', 'scoreText'] as unknown as string,
  textColor: [
    'case',
    ['==', ['get', 'isRated'], 1], '#FFFFFF',
    'rgba(255,255,255,0.6)',
  ] as unknown as string,
  textSize: ['case', ['==', ['get', 'isSelected'], 1], 12, 10] as unknown as number,
  textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
  textAllowOverlap: true,
  textIgnorePlacement: true,
};

const nameLabelStyle: SymbolLayerStyle = {
  textField: ['get', 'name'] as unknown as string,
  textColor: 'rgba(255,255,255,0.7)',
  textSize: 10,
  textOffset: [0, 2.4] as [number, number],
  textOptional: true,
  textMaxWidth: 10,
  textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
  textHaloColor: 'rgba(0,0,0,0.6)',
  textHaloWidth: 1,
};

// ── Constants ─────────────────────────────────────────────────────────────────
const TAB_BAR_HEIGHT = 90;
const NEARBY_RADIUS_M = 5000;
const TABLET_BREAKPOINT = 600;
const TRAFFIC_FADE_MS = 550;

// ── Main Component ────────────────────────────────────────────────────────────
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const { cameraRef, flyTo, flyToUser, resetToUser } = useMapCamera();

  // ── State ───────────────────────────────────────────────────────────────────
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showTraffic, setShowTraffic] = useState(false);
  // Mounted keeps the VectorSource alive during fade-out; opacity drives the visual fade
  const [trafficMounted, setTrafficMounted] = useState(false);
  const [trafficOpacity, setTrafficOpacity] = useState(0);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { places, loading, error, refetch } = useNearbyPlaces(
    userCoords ? userCoords[1] : null,
    userCoords ? userCoords[0] : null,
    NEARBY_RADIUS_M,
  );

  // ── Location permission + initial camera fly ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;
      setLocationGranted(true);
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        const coords: [number, number] = [loc.coords.longitude, loc.coords.latitude];
        setUserCoords(coords);
        flyTo(coords, 13, 1200, 0);
      } catch {
        // Default US_CENTER view stays
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Camera reset on filter change ─────────────────────────────────────────
  useEffect(() => {
    setSelectedPlace(null);
    resetToUser(userCoords);
  }, [activeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Traffic fade in/out ───────────────────────────────────────────────────
  useEffect(() => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    if (showTraffic) {
      // Mount first, then ramp opacity
      setTrafficMounted(true);
      fadeTimerRef.current = setTimeout(() => setTrafficOpacity(1), 30);
    } else {
      // Fade out, then unmount
      setTrafficOpacity(0);
      fadeTimerRef.current = setTimeout(() => setTrafficMounted(false), TRAFFIC_FADE_MS);
    }

    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [showTraffic]);

  // ── Filter places by active category ──────────────────────────────────────
  const filteredPlaces = useMemo(() => {
    if (activeFilter === 'all') return places;
    const cat = MAP_CATEGORIES.find((c) => c.key === activeFilter);
    if (!cat?.type) return places;
    return places.filter((p) => p.category === cat.type);
  }, [places, activeFilter]);

  // ── Build GeoJSON FeatureCollection ───────────────────────────────────────
  const geoJSON = useMemo<MarkerCollection>(() => {
    const features: MarkerFeature[] = filteredPlaces.map((place) => {
      const score = overallScore(place);
      const color = scoreToColor(score);
      const scoreText = place.isRated && score != null ? String(Math.round(score)) : '?';
      const props: MarkerProps = {
        id: place.id,
        name: place.name,
        isRated: place.isRated ? 1 : 0,
        scoreColorValue: color,
        scoreText,
        isSelected: selectedPlace?.id === place.id ? 1 : 0,
        category: place.category,
      };
      return {
        type: 'Feature' as const,
        id: place.id,
        geometry: {
          type: 'Point' as const,
          coordinates: [place.longitude, place.latitude],
        },
        properties: props,
      };
    });
    return { type: 'FeatureCollection' as const, features };
  }, [filteredPlaces, selectedPlace?.id]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleMarkerPress = useCallback(
    (event: OnPressEvent) => {
      const feature = event.features[0];
      if (!feature?.properties) return;
      const id = (feature.properties as GeoJsonProperties & { id?: string }).id;
      if (!id) return;
      const found = filteredPlaces.find((p) => p.id === id);
      if (!found) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedPlace(found);
      flyTo([found.longitude, found.latitude], 15, 800, 35);
    },
    [filteredPlaces, flyTo],
  );

  const handleClose = useCallback(() => {
    setSelectedPlace(null);
    resetToUser(userCoords);
  }, [resetToUser, userCoords]);

  const handleFlyToUser = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    flyToUser(userCoords);
  }, [flyToUser, userCoords]);

  const handleFilterChange = useCallback((key: string) => {
    setActiveFilter(key);
  }, []);

  const handleTrafficToggle = useCallback(() => {
    setShowTraffic((prev) => !prev);
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const ratedCount = useMemo(
    () => filteredPlaces.filter((p) => p.isRated).length,
    [filteredPlaces],
  );

  const modalLocation = useMemo<DisplayLocation | null>(() => {
    if (!selectedPlace) return null;
    return {
      id: selectedPlace.supabaseId ?? selectedPlace.id,
      name: selectedPlace.name,
      description: selectedPlace.address,
      avg_sound: selectedPlace.avg_sound,
      avg_light: selectedPlace.avg_light,
      avg_crowd: selectedPlace.avg_crowd,
      review_count: selectedPlace.review_count,
      latitude: selectedPlace.latitude,
      longitude: selectedPlace.longitude,
      googlePlaceId: selectedPlace.googlePlaceId,
    };
  }, [selectedPlace]);

  // ── Layout helpers ─────────────────────────────────────────────────────────
  // Push compass below the header (title row + filter bar ≈ 120px)
  const compassTop = insets.top + 120;

  // On tablet, sensory legend is top-right; FABs on right side need more clearance
  const legendBottomOffset = isTablet ? 0 : showTraffic ? TAB_BAR_HEIGHT + 160 : TAB_BAR_HEIGHT + 12;
  const legendTopOffset = insets.top + 130;
  const trafficLegendTopOffset = insets.top + 240;

  const trafficToggleBottom = isTablet
    ? TAB_BAR_HEIGHT + 70
    : TAB_BAR_HEIGHT + 70;
  const fabBottom = TAB_BAR_HEIGHT + 12;

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
        compassPosition={{ top: compassTop, right: 16 }}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [-98.5795, 39.8283],
            zoomLevel: 4,
          }}
        />

        {locationGranted && <UserLocation visible animated />}

        {/* Traffic congestion layer with fade-in/out opacity */}
        <TrafficLayer visible={trafficMounted} opacity={trafficOpacity} />

        {filteredPlaces.length > 0 && (
          <ShapeSource
            id="sensory-locations"
            shape={geoJSON}
            onPress={handleMarkerPress}
            hitbox={{ width: 44, height: 44 }}
          >
            <CircleLayer id="glow-layer" style={glowStyle} />
            <CircleLayer id="main-circle" style={mainCircleStyle} />
            <SymbolLayer id="score-label" style={scoreLabelStyle} />
            <SymbolLayer id="name-label" style={nameLabelStyle} />
          </ShapeSource>
        )}
      </MapView>

      {/* ── Header + Filter Bar ─────────────────────────────────────────── */}
      <MapHeader
        topInset={insets.top}
        totalCount={filteredPlaces.length}
        ratedCount={ratedCount}
        loading={loading}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        onRefresh={refetch}
      />

      {/* ── Sensory Legend ───────────────────────────────────────────────── */}
      <MapLegend
        bottomOffset={legendBottomOffset}
        topOffset={legendTopOffset}
      />

      {/* ── Traffic Legend (when traffic ON) ────────────────────────────── */}
      {showTraffic && (
        <TrafficLegend
          bottomOffset={TAB_BAR_HEIGHT + 12}
          topOffset={trafficLegendTopOffset}
        />
      )}

      {/* ── Traffic Toggle FAB ───────────────────────────────────────────── */}
      <TrafficToggle
        isActive={showTraffic}
        bottomOffset={trafficToggleBottom}
        onToggle={handleTrafficToggle}
      />

      {/* ── Locate Me FAB ────────────────────────────────────────────────── */}
      <MapFAB
        bottomOffset={fabBottom}
        onPress={handleFlyToUser}
        disabled={!locationGranted}
      />

      {/* ── Loading overlay (first load only) ───────────────────────────── */}
      {loading && places.length === 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={DarkColors.accent} />
          <Text style={styles.loadingText}>Finding places nearby…</Text>
        </View>
      )}

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error != null && !loading && places.length === 0 && (
        <ErrorBanner
          message={error}
          topOffset={insets.top + 130}
          onRetry={refetch}
        />
      )}

      {/* ── Location Modal ──────────────────────────────────────────────── */}
      {modalLocation != null && (
        <LocationModal location={modalLocation} onClose={handleClose} />
      )}
    </View>
  );
}

// ── ErrorBanner ───────────────────────────────────────────────────────────────
interface ErrorBannerProps {
  message: string;
  topOffset: number;
  onRetry: () => void;
}

function ErrorBanner({ message, topOffset, onRetry }: ErrorBannerProps) {
  return (
    <View style={[styles.errorBanner, { top: topOffset }]}>
      <Ionicons name="warning-outline" size={16} color="#FFFFFF" />
      <Text style={styles.errorText} numberOfLines={2}>
        {message}
      </Text>
      <Pressable onPress={onRetry} style={styles.retryBtn} hitSlop={8}>
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DarkColors.bg,
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,15,30,0.75)',
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
  errorBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(244,63,94,0.92)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
