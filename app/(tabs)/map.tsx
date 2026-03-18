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

import { useFocusEffect } from 'expo-router';
import LocationModal, { DisplayLocation } from '../../components/LocationModal';
import MapFAB from '../../components/map/MapFAB';
import MapHeader from '../../components/map/MapHeader';
import MapLegend from '../../components/map/MapLegend';
import TrafficLayer from '../../components/map/TrafficLayer';
import TrafficLegend from '../../components/map/TrafficLegend';
import TrafficToggle from '../../components/map/TrafficToggle';
import { MAP_CATEGORIES } from '../../components/map/MapFilterBar';
import { DarkColors, useColors } from '../../constants/theme';
import { useMapCamera } from '../../hooks/useMapCamera';
import { useNearbyPlaces, type MapPlace } from '../../hooks/useNearbyPlaces';
import { useSmartLabels } from '../../hooks/useSmartLabels';

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
  /** LLM-shortened display name for the map label */
  displayName: string;
  isRated: 0 | 1;
  scoreColorValue: string;
  isSelected: 0 | 1;
  category: string;
  /** Friendly group key for cluster aggregation (dining, shopping, health…) */
  group: string;
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

/** Theme-aware score → color. Pass the active color palette. */
function scoreToColor(score: number | null, colors: typeof DarkColors): string {
  if (score === null) return colors.textDim;
  if (score <= 3) return colors.calm;
  if (score <= 6) return colors.moderate;
  return colors.intense;
}

// ── Category → friendly group mapping ────────────────────────────────────────
const CATEGORY_TO_GROUP: Record<string, string> = {
  restaurant: 'dining', cafe: 'dining', bar: 'dining', bakery: 'dining',
  meal_delivery: 'dining', meal_takeaway: 'dining', food: 'dining',
  store: 'shopping', shopping_mall: 'shopping', supermarket: 'shopping',
  clothing_store: 'shopping', convenience_store: 'shopping',
  hospital: 'health', pharmacy: 'health', doctor: 'health',
  dentist: 'health', health: 'health', veterinary_care: 'health',
  park: 'outdoors', gym: 'outdoors', stadium: 'outdoors',
  campground: 'outdoors',
  movie_theater: 'fun', museum: 'fun', night_club: 'fun',
  amusement_park: 'fun', bowling_alley: 'fun', aquarium: 'fun',
  library: 'civic', school: 'civic', university: 'civic',
  church: 'civic', city_hall: 'civic', courthouse: 'civic',
  fire_station: 'civic', police: 'civic', post_office: 'civic',
};

function toCategoryGroup(category: string): string {
  return CATEGORY_TO_GROUP[category] ?? 'services';
}

// Group keys used for cluster aggregation
const GROUP_KEYS = ['dining', 'shopping', 'health', 'outdoors', 'fun', 'civic', 'services'] as const;
const GROUP_LABELS: Record<string, string> = {
  dining: 'Dining', shopping: 'Shopping', health: 'Health',
  outdoors: 'Outdoors', fun: 'Entertainment', civic: 'Civic',
  services: 'Services',
};

// ── clusterProperties — count each group within every cluster ────────────────
const clusterProperties: Record<string, any> = {};
for (const g of GROUP_KEYS) {
  clusterProperties[`n_${g}`] = [
    ['+'],
    ['case', ['==', ['get', 'group'], g], 1, 0],
  ];
}

// ── Build "dominant group label" Mapbox expression ───────────────────────────
// Finds which n_* count is highest and returns its friendly label.
// Requires count > 0 so tied-at-zero groups don't falsely win.
function buildDominantGroupExpr(): any[] {
  const keys = GROUP_KEYS.map((g) => `n_${g}`);
  const cases: any[] = [];

  for (const group of GROUP_KEYS) {
    const key = `n_${group}`;
    // This group is dominant if its count > 0 AND strictly >= every other
    const comparisons = keys
      .filter((k) => k !== key)
      .map((other) => ['>=', ['get', key], ['get', other]]);
    cases.push(['all', ['>', ['get', key], 0], ...comparisons], GROUP_LABELS[group]);
  }
  cases.push('Places'); // fallback when all counts are 0 or tied
  return ['case', ...cases];
}

const dominantGroupExpr = buildDominantGroupExpr();

// ── Filters ──────────────────────────────────────────────────────────────────
const unclusteredFilter = ['!', ['has', 'point_count']] as const;
const clusterFilter = ['has', 'point_count'] as const;

// ── Theme-aware layer style builders ─────────────────────────────────────────
/** Convert hex (#RRGGBB) to rgba string with given alpha */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function buildClusterCircleStyle(C: typeof DarkColors): CircleLayerStyle {
  return {
    circleColor: hexToRgba(C.accent, 0.5),
    circleRadius: [
      'step', ['get', 'point_count'],
      20, 15, 24, 50, 30,
    ] as unknown as number,
    circleStrokeWidth: 1.5,
    circleStrokeColor: hexToRgba(C.border, 0.25),
    circleBlur: 0.05,
  };
}

function buildClusterLabelStyle(C: typeof DarkColors): SymbolLayerStyle {
  return {
    textField: [
      'concat',
      ['to-string', ['get', 'point_count']],
      '\n',
      dominantGroupExpr,
    ] as unknown as string,
    textColor: C.text,
    textSize: 11,
    textLineHeight: 1.25,
    textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
    textAllowOverlap: true,
    textIgnorePlacement: true,
  };
}

function buildGlowStyle(): CircleLayerStyle {
  return {
    circleColor: ['get', 'scoreColorValue'] as unknown as string,
    circleRadius: ['case', ['==', ['get', 'isSelected'], 1], 28, 0] as unknown as number,
    circleOpacity: 0.18,
    circleBlur: 0.8,
  };
}

function buildMainCircleStyle(C: typeof DarkColors): CircleLayerStyle {
  return {
    circleColor: [
      'case',
      ['==', ['get', 'isRated'], 1],
      ['get', 'scoreColorValue'],
      C.textDim,
    ] as unknown as string,
    circleOpacity: [
      'case', ['==', ['get', 'isRated'], 0], 0.35, 1,
    ] as unknown as number,
    circleRadius: [
      'case',
      ['==', ['get', 'isSelected'], 1], 10,
      ['==', ['get', 'isRated'], 1], 7,
      5,
    ] as unknown as number,
    circleStrokeWidth: [
      'case',
      ['==', ['get', 'isSelected'], 1], 2.5,
      ['==', ['get', 'isRated'], 1], 2,
      1,
    ] as unknown as number,
    circleStrokeColor: hexToRgba(C.text, 0.85),
    circleStrokeOpacity: [
      'case',
      ['==', ['get', 'isSelected'], 1], 1,
      ['==', ['get', 'isRated'], 1], 0.6,
      0.15,
    ] as unknown as number,
    circleSortKey: [
      'case', ['==', ['get', 'isRated'], 1], 1, 0,
    ] as unknown as number,
  };
}

function buildNameLabelStyle(C: typeof DarkColors): SymbolLayerStyle {
  return {
    textField: ['get', 'displayName'] as unknown as string,
    textColor: [
      'case',
      ['==', ['get', 'isSelected'], 1], C.text,
      ['==', ['get', 'isRated'], 1], C.textMuted,
      C.textDim,
    ] as unknown as string,
    textSize: [
      'case',
      ['==', ['get', 'isSelected'], 1], 12,
      ['==', ['get', 'isRated'], 1], 10,
      9,
    ] as unknown as number,
    textOffset: [0, 1.2] as [number, number],
    textAnchor: 'top',
    textMaxWidth: 7,
    textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
    textHaloColor: hexToRgba(C.bg, 0.8),
    textHaloWidth: 1.4,
    textAllowOverlap: true,
    textIgnorePlacement: true,
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TAB_BAR_HEIGHT = 90;
const NEARBY_RADIUS_M = 5000;
const TABLET_BREAKPOINT = 600;
const TRAFFIC_FADE_MS = 550;
// How far (meters) the map center must move before triggering a new fetch
const MIN_PAN_REFETCH_M = 2500;
// How long to wait after the user stops panning before fetching (ms)
const PAN_DEBOUNCE_MS = 800;

// ── Haversine (meters) ────────────────────────────────────────────────────────
function distMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const C = useColors();
  const mapStyleURL = C === DarkColors
    ? 'mapbox://styles/aaronnnn/cmmqhj5yd000401s6bbso6qma'
    : 'mapbox://styles/aaronnnn/cmmqgvnh7006h01qu8qsl4wcy';
  const { cameraRef, flyTo, flyToUser, resetToUser } = useMapCamera();
  const { getDisplayName } = useSmartLabels();

  // ── Theme-aware map layer styles ──────────────────────────────────────────
  const clusterCircleStyle = useMemo(() => buildClusterCircleStyle(C), [C]);
  const clusterLabelStyle = useMemo(() => buildClusterLabelStyle(C), [C]);
  const glowStyle = useMemo(() => buildGlowStyle(), []);
  const mainCircleStyle = useMemo(() => buildMainCircleStyle(C), [C]);
  const nameLabelStyle = useMemo(() => buildNameLabelStyle(C), [C]);

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
  // Track map centers we've already fetched so we skip redundant calls
  const fetchedCentersRef = useRef<Array<[number, number]>>([]);
  const panFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFetchingArea, setIsFetchingArea] = useState(false);
  // Track the last user-panned camera state so close restores it (not user location)
  const lastCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const preSelectCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);

  const { places, loading, error, refetch, fetchAround } = useNearbyPlaces(
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
        // Seed the initial fetch center so nearby pans don't re-fetch the same area
        fetchedCentersRef.current = [[loc.coords.latitude, loc.coords.longitude]];
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
  // Clustering handles density — no need to hide places by zoom level
  const filteredPlaces = useMemo(() => {
    if (activeFilter === 'all') return places;
    const cat = MAP_CATEGORIES.find((c) => c.key === activeFilter);
    if (!cat?.type) return places;
    return places.filter((p) => p.category === cat.type);
  }, [places, activeFilter]);

  // ── Build GeoJSON FeatureCollection ───────────────────────────────────────
  const geoJSON = useMemo<MarkerCollection>(() => {
    const rated = filteredPlaces.filter((p) => p.isRated);
    if (rated.length > 0) {
      console.log(`[Map GeoJSON] ${rated.length} rated places:`, rated.map((p) => ({
        name: p.name, sound: p.avg_sound, light: p.avg_light, crowd: p.avg_crowd,
        score: overallScore(p), color: scoreToColor(overallScore(p), C),
      })));
    }
    const features: MarkerFeature[] = filteredPlaces.map((place) => {
      const score = overallScore(place);
      // Rated places with no scores yet get accent color instead of gray
      const color = place.isRated && score === null
        ? C.accent
        : scoreToColor(score, C);
      const props: MarkerProps = {
        id: place.id,
        name: place.name,
        displayName: getDisplayName(place.name),
        isRated: place.isRated ? 1 : 0,
        scoreColorValue: color,
        isSelected: selectedPlace?.id === place.id ? 1 : 0,
        category: place.category,
        group: toCategoryGroup(place.category),
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
  }, [filteredPlaces, selectedPlace?.id, getDisplayName, C]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleMarkerPress = useCallback(
    (event: OnPressEvent) => {
      const feature = event.features[0];
      if (!feature?.properties) return;
      const props = feature.properties as GeoJsonProperties;

      // If user tapped a cluster, zoom into it smoothly
      if (props?.cluster === true || props?.point_count != null) {
        const coords = (feature.geometry as Point).coordinates as [number, number];
        const currentZoom = lastCameraRef.current?.zoom ?? 13;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        flyTo(coords, Math.min(currentZoom + 2.5, 17), 800, 0);
        return;
      }

      const id = (props as GeoJsonProperties & { id?: string })?.id;
      if (!id) return;
      const found = filteredPlaces.find((p) => p.id === id);
      if (!found) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Snapshot camera state before flying to the marker so close can restore it
      preSelectCameraRef.current = lastCameraRef.current;
      setSelectedPlace(found);
      flyTo([found.longitude, found.latitude], 15, 800, 35);
    },
    [filteredPlaces, flyTo],
  );

  const handleClose = useCallback(() => {
    setSelectedPlace(null);
    if (preSelectCameraRef.current) {
      const { center, zoom } = preSelectCameraRef.current;
      flyTo(center, zoom, 550, 0);
      preSelectCameraRef.current = null;
    } else {
      resetToUser(userCoords);
    }
  }, [flyTo, resetToUser, userCoords]);

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

  // ── Auto-fetch on pan (onMapIdle) ───────────────────────────────────────────
  const handleRegionDidChange = useCallback(
    (state: any) => {
      // onMapIdle provides MapState: { properties: { center, zoom, ... }, gestures }
      const center = state.properties?.center;
      const zoom = state.properties?.zoom ?? 13;
      if (!center || !Array.isArray(center) || center.length < 2) return;
      const [lng, lat] = center as [number, number];
      lastCameraRef.current = { center: [lng, lat], zoom };

      // Debounce — reset timer each time the region changes
      if (panFetchTimerRef.current) clearTimeout(panFetchTimerRef.current);
      panFetchTimerRef.current = setTimeout(() => {
        // Skip if we've already fetched close to this center
        const alreadyCovered = fetchedCentersRef.current.some(
          ([fLat, fLng]) => distMeters(lat, lng, fLat, fLng) < MIN_PAN_REFETCH_M,
        );
        if (alreadyCovered) return;

        // Register center and kick off background fetch
        fetchedCentersRef.current.push([lat, lng]);
        setIsFetchingArea(true);
        fetchAround(lat, lng);
        // Clear the indicator after a generous window
        setTimeout(() => setIsFetchingArea(false), 3500);
      }, PAN_DEBOUNCE_MS);
    },
    [fetchAround],
  );

  // Reset fetch-center cache whenever the user triggers a hard refetch
  const handleRefetch = useCallback(() => {
    fetchedCentersRef.current = userCoords
      ? [[userCoords[1], userCoords[0]]]
      : [];
    refetch();
  }, [refetch, userCoords]);

  // ── Refresh Supabase data when tab regains focus (e.g. after submitting a review)
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) { isFirstFocus.current = false; return; }
      refetch();
    }, [refetch]),
  );

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
  const legendBottomOffset = isTablet ? 0 : showTraffic ? TAB_BAR_HEIGHT + 90 : TAB_BAR_HEIGHT + 12;
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
        key={mapStyleURL}
        style={styles.map}
        styleURL={mapStyleURL}
        
        scaleBarEnabled={false}
        attributionEnabled={false}
        logoEnabled={false}
        compassEnabled
        compassPosition={{ top: compassTop, right: 16 }}
        onMapIdle={handleRegionDidChange}
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
            cluster
            clusterRadius={50}
            clusterMaxZoomLevel={15}
            clusterProperties={clusterProperties}
          >
            {/* ── Cluster: frosted bubble + smart label ──────── */}
            <CircleLayer id="cluster-circle" style={clusterCircleStyle} filter={clusterFilter} />
            <SymbolLayer id="cluster-label" style={clusterLabelStyle} filter={clusterFilter} />

            {/* ── Individual: small dot + name ───────────────── */}
            <CircleLayer id="glow-layer" style={glowStyle} filter={unclusteredFilter} />
            <CircleLayer id="main-circle" style={mainCircleStyle} filter={unclusteredFilter} />
            <SymbolLayer id="name-label" style={nameLabelStyle} filter={unclusteredFilter} />
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
        onRefresh={handleRefetch}
      />

      {/* ── Sensory Legend — hidden while a place is open ───────────────── */}
      {!selectedPlace && (
        <MapLegend
          bottomOffset={legendBottomOffset}
          topOffset={legendTopOffset}
        />
      )}

      {/* ── Traffic Legend (when traffic ON, no place selected) ──────────── */}
      {showTraffic && !selectedPlace && (
        <TrafficLegend
          bottomOffset={TAB_BAR_HEIGHT + 12}
          topOffset={trafficLegendTopOffset}
        />
      )}

      {/* ── Traffic Toggle FAB — hidden while a place is open ────────────── */}
      {!selectedPlace && (
        <TrafficToggle
          isActive={showTraffic}
          bottomOffset={trafficToggleBottom}
          onToggle={handleTrafficToggle}
        />
      )}

      {/* ── Locate Me FAB — hidden while a place is open ────────────────── */}
      {!selectedPlace && (
        <MapFAB
          bottomOffset={fabBottom}
          onPress={handleFlyToUser}
          disabled={!locationGranted}
        />
      )}

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

      {/* ── Pan-fetch indicator ──────────────────────────────────────────── */}
      {isFetchingArea && (
        <View style={[styles.fetchPill, { top: insets.top + 130 }]}>
          <ActivityIndicator size="small" color="#FFFFFF" style={{ transform: [{ scale: 0.75 }] }} />
          <Text style={styles.fetchPillText}>Searching area…</Text>
        </View>
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
  fetchPill: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -70 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(30,40,60,0.88)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    zIndex: 25,
  },
  fetchPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
