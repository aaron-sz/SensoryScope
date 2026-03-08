/**
 * Map Tab
 * Full-screen Google Maps with sensory-scored pins, category filters,
 * floating search, and a selected-place bottom card with sensory breakdowns.
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, {
  runOnJS,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlaceDetailSheet from '../../components/PlaceDetailSheet';
import { PlaceData } from '../../components/PlaceCard';
import {
  Radius,
  Shadows,
  Spacing,
  scoreColor,
  scoreGlow,
  useColors,
} from '../../constants/theme';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SensoryScore = {
  avg_sound: number;
  avg_light: number;
  avg_crowd: number;
  count: number;
};

type PlaceWithSensory = PlaceData & {
  sensory?: SensoryScore;
  distance_mi?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'restaurant', label: '🍽️ Restaurants', type: 'restaurant' },
  { key: 'cafe', label: '☕ Cafes', type: 'cafe' },
  { key: 'park', label: '🌳 Parks', type: 'park' },
  { key: 'library', label: '📚 Libraries', type: 'library' },
  { key: 'shopping_mall', label: '🛍️ Shopping', type: 'shopping_mall' },
  { key: 'gym', label: '💪 Gyms', type: 'gym' },
  { key: 'museum', label: '🏛️ Museums', type: 'museum' },
  { key: 'bar', label: '🍸 Bars', type: 'bar' },
  { key: 'meal_takeaway', label: '🥡 Takeaway', type: 'meal_takeaway' },
];

const RADIUS_OPTIONS = [
  { label: '1 mi', meters: 1609 },
  { label: '5 mi', meters: 8045 },
  { label: '10 mi', meters: 16090 },
  { label: '25 mi', meters: 40225 },
];

const DEFAULT_REGION = {
  latitude: 35.7796,
  longitude: -78.6382,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getPhotoUrl(ref: string, maxWidth = 400): string {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${ref}&key=${key}`;
}

function getCategoryLabel(types?: string[]): string {
  if (!types?.length) return '📍 Place';
  const map: Record<string, string> = {
    restaurant: '🍽️ Restaurant', cafe: '☕ Cafe', library: '📚 Library',
    park: '🌳 Park', shopping_mall: '🛍️ Shopping', store: '🛍️ Store',
    gym: '💪 Gym', bar: '🍸 Bar', movie_theater: '🎬 Theater',
    museum: '🏛️ Museum', supermarket: '🛒 Supermarket', meal_takeaway: '🥡 Takeaway',
  };
  for (const t of types) { if (map[t]) return map[t]; }
  return '📍 Place';
}

// ─────────────────────────────────────────────────────────────────────────────
// MapPin — NO react-native-reanimated (Android Marker crash prevention)
// ─────────────────────────────────────────────────────────────────────────────

const MapPin = React.memo(
  function MapPin({ score, isSelected }: { score: number | null; isSelected: boolean }) {
    const safeScore = score ?? 5;
    const color = scoreColor(safeScore);
    const glow = scoreGlow(safeScore);
    const size = isSelected ? 42 : 32;
    return (
      <View style={pinStyles.wrapper} collapsable={false}>
        <View style={[pinStyles.halo, { width: size + 12, height: size + 12, borderRadius: (size + 12) / 2, backgroundColor: glow }]}>
          <View style={[
            pinStyles.circle,
            {
              width: size, height: size, borderRadius: size / 2,
              backgroundColor: color,
              borderWidth: isSelected ? 3 : 1.5,
              borderColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
            },
          ]}>
            <Text style={[pinStyles.scoreText, { fontSize: isSelected ? 14 : 11, color: '#FFFFFF' }]}>
              {score !== null ? Math.round(score) : '?'}
            </Text>
          </View>
        </View>
        <View style={[pinStyles.pointer, { borderTopColor: color }]} />
      </View>
    );
  },
  (p, n) => p.score === n.score && p.isSelected === n.isSelected
);

// ─────────────────────────────────────────────────────────────────────────────
// SensoryMiniScore
// ─────────────────────────────────────────────────────────────────────────────

function SensoryMiniScore({ icon, label, score }: { icon: string; label: string; score: number }) {
  const C = useColors();
  const color = scoreColor(score);
  return (
    <View style={cardStyles.miniScore}>
      <Text style={cardStyles.miniIcon}>{icon}</Text>
      <View style={[cardStyles.miniBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
        <Text style={[cardStyles.miniNum, { color }]}>{Math.round(score)}</Text>
      </View>
      <Text style={[cardStyles.miniLabel, { color: C.textDim }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ActionButton — spring press feedback
// ─────────────────────────────────────────────────────────────────────────────

function ActionButton({
  icon, label, tint, onPress,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; tint: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPressIn={() => { scale.value = withSpring(0.94, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={{ flex: 1 }}
    >
      <Animated.View style={[cardStyles.actionBtn, { backgroundColor: tint + '1A', borderColor: tint + '44' }, aStyle]}>
        <Ionicons name={icon} size={16} color={tint} />
        <Text style={[cardStyles.actionBtnText, { color: tint }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SelectedPlaceCard
// ─────────────────────────────────────────────────────────────────────────────

function SelectedPlaceCard({
  place, onClose, onDetails,
}: { place: PlaceWithSensory; onClose: () => void; onDetails: () => void }) {
  const C = useColors();
  const translateY = useSharedValue(0);

  const photoRef = place.photos?.[0]?.photo_reference;
  const category = getCategoryLabel(place.types);
  const isOpen = place.opening_hours?.open_now;
  const { sensory } = place;
  const overallScore = sensory
    ? (sensory.avg_sound + sensory.avg_light + sensory.avg_crowd) / 3
    : null;

  const pan = Gesture.Pan()
    .onUpdate((e) => { if (e.translationY > 0) translateY.value = e.translationY; })
    .onEnd((e) => {
      if (e.translationY > 90) { runOnJS(onClose)(); }
      else { translateY.value = withSpring(0, { damping: 20, stiffness: 220 }); }
    });

  const cardAnim = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  function openDirections() {
    const { lat, lng } = place.geometry.location;
    Linking.openURL(`https://maps.google.com/?daddr=${lat},${lng}`);
  }

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[cardStyles.card, { backgroundColor: C.elevated }, cardAnim]}>
        {/* Drag handle */}
        <View style={[cardStyles.handle, { backgroundColor: C.border }]} />

        <View style={cardStyles.row}>
          {/* Photo */}
          {photoRef && (
            <Animated.Image
              source={{ uri: getPhotoUrl(photoRef, 300) }}
              style={[cardStyles.photo, { borderColor: C.border }]}
              resizeMode="cover"
            />
          )}

          <View style={cardStyles.info}>
            {/* Header */}
            <View style={cardStyles.infoHeader}>
              <Text style={[cardStyles.name, { color: C.text }]} numberOfLines={2}>
                {place.name}
              </Text>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Dismiss" accessibilityRole="button">
                <View style={[cardStyles.closeCircle, { backgroundColor: C.surface }]}>
                  <Ionicons name="close" size={16} color={C.textMuted} />
                </View>
              </Pressable>
            </View>

            {/* Category · rating · open */}
            <View style={cardStyles.metaRow}>
              <Text style={[cardStyles.catText, { color: C.textMuted }]}>{category}</Text>
              {place.rating != null && (
                <Text style={[cardStyles.ratingText, { color: C.textMuted }]}>
                  {'  ·  ⭐ '}{place.rating.toFixed(1)}
                </Text>
              )}
              {isOpen !== undefined && (
                <View style={[cardStyles.openPill, { backgroundColor: isOpen ? C.calmGlow : C.intenseGlow }]}>
                  <Text style={[cardStyles.openText, { color: isOpen ? C.calm : C.intense }]}>
                    {isOpen ? 'Open' : 'Closed'}
                  </Text>
                </View>
              )}
            </View>

            {place.distance_mi != null && (
              <Text style={[cardStyles.distText, { color: C.textDim }]}>
                📍 {place.distance_mi.toFixed(1)} mi away
              </Text>
            )}
          </View>
        </View>

        {/* Sensory scores */}
        {sensory ? (
          <View style={cardStyles.sensoryRow}>
            <View style={cardStyles.miniScores}>
              <SensoryMiniScore icon="🔊" label="Noise" score={sensory.avg_sound} />
              <SensoryMiniScore icon="💡" label="Light" score={sensory.avg_light} />
              <SensoryMiniScore icon="👥" label="Crowd" score={sensory.avg_crowd} />
            </View>
            {overallScore != null && (
              <View style={cardStyles.overallWrap}>
                <View style={[cardStyles.overallCircle, { backgroundColor: scoreColor(overallScore) }]}>
                  <Text style={cardStyles.overallNum}>{Math.round(overallScore)}</Text>
                </View>
                <Text style={[cardStyles.overallLabel, { color: C.textDim }]}>Sensory{'\n'}Score</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[cardStyles.noRatings, { backgroundColor: C.surface }]}>
            <Text style={[cardStyles.noRatingsText, { color: C.textMuted }]}>
              No sensory ratings yet — be the first to rate!
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={cardStyles.actionRow}>
          <ActionButton icon="navigate-outline" label="Directions" tint={C.accent} onPress={openDirections} />
          <ActionButton icon="document-text-outline" label="Full Details" tint={C.primary} onPress={onDetails} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main MapScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const mapRef = useRef<MapView>(null);
  const searchRef = useRef<TextInput>(null);

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [places, setPlaces] = useState<PlaceWithSensory[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key);
  const [radiusIdx, setRadiusIdx] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceWithSensory[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const customMapStyle = useMemo(() => (isDark ? DARK_MAP_STYLE : []), [isDark]);
  const selectedPlace = useMemo(
    () => places.find((p) => p.place_id === selectedPlaceId) ?? null,
    [places, selectedPlaceId]
  );

  // Map padding adjusts so pins don't hide under top overlay
  const mapTopPad = insets.top + 8 + (searchOpen && searchResults.length > 0 ? 280 : 160);

  // ── Location ──

  const initLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setUserLat(DEFAULT_REGION.latitude); setUserLng(DEFAULT_REGION.longitude); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLat(loc.coords.latitude);
      setUserLng(loc.coords.longitude);
    } catch {
      const last = await Location.getLastKnownPositionAsync();
      if (last) { setUserLat(last.coords.latitude); setUserLng(last.coords.longitude); }
      else { setUserLat(DEFAULT_REGION.latitude); setUserLng(DEFAULT_REGION.longitude); }
    }
  }, []);

  useEffect(() => { initLocation(); }, [initLocation]);

  // Fly to user on first fix
  useEffect(() => {
    if (userLat == null || userLng == null) return;
    mapRef.current?.animateToRegion(
      { latitude: userLat, longitude: userLng, latitudeDelta: 0.04, longitudeDelta: 0.04 },
      800
    );
  }, [userLat, userLng]);

  // ── Sensory scores from Supabase ──

  const fetchSensoryScores = useCallback(async (
    placeIds: string[]
  ): Promise<Record<string, SensoryScore>> => {
    if (!placeIds.length) return {};
    try {
      const { data, error } = await supabase
        .from('place_reviews')
        .select('place_id, sound_rating, light_rating, crowd_rating')
        .in('place_id', placeIds);
      if (error || !data) return {};
      const acc: Record<string, { ss: number; sl: number; sc: number; n: number }> = {};
      for (const r of data) {
        if (!acc[r.place_id]) acc[r.place_id] = { ss: 0, sl: 0, sc: 0, n: 0 };
        acc[r.place_id].ss += r.sound_rating;
        acc[r.place_id].sl += r.light_rating;
        acc[r.place_id].sc += r.crowd_rating;
        acc[r.place_id].n++;
      }
      const result: Record<string, SensoryScore> = {};
      for (const [pid, s] of Object.entries(acc)) {
        result[pid] = { avg_sound: s.ss / s.n, avg_light: s.sl / s.n, avg_crowd: s.sc / s.n, count: s.n };
      }
      return result;
    } catch { return {}; }
  }, []);

  // ── Fetch nearby places ──

  const fetchPlaces = useCallback(async () => {
    if (userLat == null || userLng == null) return;
    const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!API_KEY) return;
    setLoading(true);
    try {
      const radius = RADIUS_OPTIONS[radiusIdx].meters;
      const cat = CATEGORIES.find((c) => c.key === activeCategory);
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userLat},${userLng}&radius=${radius}&type=${cat?.type ?? 'point_of_interest'}&key=${API_KEY}`;
      const json = await fetch(url).then((r) => r.json());
      if (json.results) {
        const raw: PlaceWithSensory[] = json.results.map((p: PlaceData) => ({
          ...p,
          distance_mi: distanceMiles(userLat, userLng!, p.geometry.location.lat, p.geometry.location.lng),
        }));
        const sensoryMap = await fetchSensoryScores(raw.map((p) => p.place_id));
        setPlaces(raw.map((p) => ({ ...p, sensory: sensoryMap[p.place_id] })));
      }
    } catch (e) { console.warn('[MapTab] fetch error', e); }
    finally { setLoading(false); }
  }, [userLat, userLng, activeCategory, radiusIdx, fetchSensoryScores]);

  useEffect(() => { if (userLat != null) fetchPlaces(); }, [fetchPlaces, userLat]);

  // ── Search ──

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => doSearch(searchQuery), 280);
    return () => clearTimeout(t);
  }, [searchQuery, userLat, userLng]);

  async function doSearch(text: string) {
    const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!API_KEY) return;
    try {
      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(text)}&key=${API_KEY}`;
      if (userLat != null && userLng != null) url += `&location=${userLat},${userLng}&radius=30000`;
      const json = await fetch(url).then((r) => r.json());
      if (json.results) {
        const sorted: PlaceWithSensory[] = (json.results as PlaceData[])
          .map((p) => ({
            ...p,
            distance_mi: userLat != null && userLng != null
              ? distanceMiles(userLat, userLng, p.geometry.location.lat, p.geometry.location.lng)
              : undefined,
          }))
          .sort((a, b) => (a.distance_mi ?? Infinity) - (b.distance_mi ?? Infinity));
        setSearchResults(sorted);
      }
    } catch { /* silent */ }
  }

  const flyToPlace = useCallback((place: PlaceWithSensory) => {
    const { lat, lng } = place.geometry.location;
    mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);
    setPlaces((prev) => prev.find((p) => p.place_id === place.place_id) ? prev : [...prev, place]);
    setSelectedPlaceId(place.place_id);
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  }, []);

  const handleMarkerPress = useCallback((place: PlaceWithSensory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlaceId(place.place_id);
    setShowDetail(false);
  }, []);

  const centerOnUser = useCallback(() => {
    if (userLat == null || userLng == null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapRef.current?.animateToRegion(
      { latitude: userLat, longitude: userLng, latitudeDelta: 0.04, longitudeDelta: 0.04 },
      600
    );
  }, [userLat, userLng]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>

      {/* ── Full-screen map ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        customMapStyle={customMapStyle}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
        showsBuildings
        showsIndoors
        showsPointsOfInterest
        zoomEnabled
        zoomControlEnabled={false}
        rotateEnabled
        scrollEnabled
        pitchEnabled
        loadingEnabled
        loadingIndicatorColor={C.accent}
        loadingBackgroundColor={isDark ? '#1a1a2e' : '#f8fafc'}
        moveOnMarkerPress={false}
        mapPadding={{ top: mapTopPad, right: 0, bottom: 0, left: 0 }}
        onPress={() => { if (!searchOpen) setSelectedPlaceId(null); }}
      >
        {places.map((place) => {
          const { lat, lng } = place.geometry.location;
          if (!lat || !lng) return null;
          const isSelected = place.place_id === selectedPlaceId;
          const score = place.sensory
            ? (place.sensory.avg_sound + place.sensory.avg_light + place.sensory.avg_crowd) / 3
            : null;
          return (
            <Marker
              key={place.place_id}
              coordinate={{ latitude: lat, longitude: lng }}
              onPress={() => handleMarkerPress(place)}
              tracksViewChanges={isSelected}
              anchor={{ x: 0.5, y: 1 }}
            >
              <MapPin score={score} isSelected={isSelected} />
            </Marker>
          );
        })}
      </MapView>

      {/* ── Top overlay ── */}
      <View
        style={[styles.topOverlay, { top: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        {/* Search bar */}
        <View pointerEvents="auto">
          <Pressable
            style={[
              styles.searchBar,
              { backgroundColor: C.elevated, borderColor: searchOpen ? C.accent : C.border },
              Shadows.card,
            ]}
            onPress={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 40); }}
            accessibilityLabel="Search for places"
            accessibilityRole="search"
          >
            <Ionicons name="search" size={18} color={searchOpen ? C.accent : C.textMuted} />
            <TextInput
              ref={searchRef}
              style={[styles.searchInput, { color: C.text }]}
              placeholder="Search nearby places..."
              placeholderTextColor={C.textDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
              editable={searchOpen}
              pointerEvents={searchOpen ? 'auto' : 'none'}
              returnKeyType="search"
              onFocus={() => setSearchOpen(true)}
            />
            {searchOpen && (
              <Pressable onPress={closeSearch} hitSlop={12} accessibilityLabel="Close search">
                <Ionicons name="close-circle" size={20} color={C.textMuted} />
              </Pressable>
            )}
          </Pressable>
        </View>

        {/* Search results dropdown */}
        {searchOpen && searchResults.length > 0 && (
          <View
            style={[styles.searchResults, { backgroundColor: C.elevated }, Shadows.glow]}
            pointerEvents="auto"
          >
            {searchResults.slice(0, 6).map((r, i) => (
              <Pressable
                key={r.place_id}
                style={[styles.searchResultRow, i < Math.min(searchResults.length, 6) - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onPress={() => flyToPlace(r)}
                accessibilityLabel={`Go to ${r.name}`}
                accessibilityRole="button"
              >
                <Ionicons name="location-outline" size={16} color={C.accent} />
                <View style={styles.searchResultText}>
                  <Text style={[styles.searchResultName, { color: C.text }]} numberOfLines={1}>{r.name}</Text>
                  {r.vicinity ? <Text style={[styles.searchResultAddr, { color: C.textMuted }]} numberOfLines={1}>{r.vicinity}</Text> : null}
                </View>
                {r.distance_mi != null && (
                  <Text style={[styles.searchResultDist, { color: C.textDim }]}>{r.distance_mi.toFixed(1)} mi</Text>
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* Category chips + filter — hidden while searching */}
        {!searchOpen && (
          <View pointerEvents="auto">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              keyboardShouldPersistTaps="handled"
            >
              {CATEGORIES.map((cat) => {
                const active = cat.key === activeCategory;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => { setActiveCategory(cat.key); setSelectedPlaceId(null); }}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: active ? C.accent : C.elevated,
                        borderColor: active ? C.accent : C.border,
                      },
                      Shadows.subtle,
                    ]}
                    activeOpacity={0.75}
                    accessibilityLabel={cat.label}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.catChipText, { color: active ? '#fff' : C.text }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterPill, { backgroundColor: C.elevated, borderColor: C.border }, Shadows.subtle]}
                onPress={() => setRadiusIdx((i) => (i + 1) % RADIUS_OPTIONS.length)}
                accessibilityLabel="Change radius"
                accessibilityRole="button"
              >
                <Ionicons name="resize" size={13} color={C.accent} />
                <Text style={[styles.filterPillText, { color: C.text }]}>{RADIUS_OPTIONS[radiusIdx].label}</Text>
              </TouchableOpacity>

              {loading ? (
                <View style={[styles.filterPill, { backgroundColor: C.elevated, borderColor: C.border }, Shadows.subtle]}>
                  <ActivityIndicator size="small" color={C.accent} />
                  <Text style={[styles.filterPillText, { color: C.textMuted }]}>Loading...</Text>
                </View>
              ) : (
                <View style={[styles.filterPill, { backgroundColor: C.elevated, borderColor: C.border }, Shadows.subtle]}>
                  <Ionicons name="location" size={13} color={C.textDim} />
                  <Text style={[styles.filterPillText, { color: C.textMuted }]}>{places.length} places</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* ── User location FAB ── */}
      <Pressable
        style={[styles.fab, { backgroundColor: C.elevated, bottom: insets.bottom + 108 }, Shadows.card]}
        onPress={centerOnUser}
        accessibilityLabel="Center map on my location"
        accessibilityRole="button"
      >
        <Ionicons name="locate" size={22} color={C.accent} />
      </Pressable>

      {/* ── Selected place bottom card ── */}
      {selectedPlace != null && !showDetail && (
        <Animated.View
          key={selectedPlace.place_id}
          entering={SlideInDown.springify().damping(22).stiffness(200)}
          exiting={SlideOutDown.springify().damping(22).stiffness(200)}
          style={[styles.cardContainer, { bottom: insets.bottom + 94 }]}
        >
          <SelectedPlaceCard
            place={selectedPlace}
            onClose={() => setSelectedPlaceId(null)}
            onDetails={() => setShowDetail(true)}
          />
        </Animated.View>
      )}

      {/* ── Full detail sheet ── */}
      {showDetail && selectedPlace != null && (
        <PlaceDetailSheet
          place={selectedPlace}
          onClose={() => setShowDetail(false)}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const pinStyles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  halo: { alignItems: 'center', justifyContent: 'center', elevation: 4 },
  circle: { alignItems: 'center', justifyContent: 'center', elevation: 6 },
  scoreText: { fontWeight: '800' },
  pointer: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -1,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 16,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 10, marginBottom: 12,
  },
  row: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 12 },
  photo: {
    width: 80, height: 80, borderRadius: Radius.md,
    flexShrink: 0, borderWidth: 1,
  },
  info: { flex: 1 },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 6, lineHeight: 21 },
  closeCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 3, gap: 4 },
  catText: { fontSize: 12 },
  ratingText: { fontSize: 12 },
  openPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  openText: { fontSize: 11, fontWeight: '600' },
  distText: { fontSize: 12, marginTop: 3 },

  sensoryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: Spacing.md, marginTop: 12,
    paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  miniScores: { flexDirection: 'row', gap: 16 },
  miniScore: { alignItems: 'center', gap: 2 },
  miniIcon: { fontSize: 16 },
  miniBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  miniNum: { fontSize: 13, fontWeight: '700' },
  miniLabel: { fontSize: 10, fontWeight: '500' },

  overallWrap: { alignItems: 'center', gap: 4 },
  overallCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  overallNum: { fontSize: 15, fontWeight: '800', color: '#fff' },
  overallLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center', lineHeight: 13 },

  noRatings: { marginHorizontal: Spacing.md, marginTop: 10, padding: 10, borderRadius: Radius.sm },
  noRatingsText: { fontSize: 12, fontStyle: 'italic', textAlign: 'center' },

  actionRow: { flexDirection: 'row', gap: 10, marginHorizontal: Spacing.md, marginTop: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Top overlay
  topOverlay: { position: 'absolute', left: 0, right: 0, paddingHorizontal: Spacing.md },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 46, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, borderWidth: 1.5,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  searchResults: {
    borderRadius: Radius.md, overflow: 'hidden',
    marginBottom: 8,
  },
  searchResultRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 14, gap: 10,
  },
  searchResultText: { flex: 1 },
  searchResultName: { fontSize: 14, fontWeight: '600' },
  searchResultAddr: { fontSize: 12, marginTop: 1 },
  searchResultDist: { fontSize: 12, fontWeight: '500' },

  // Category chips
  chipRow: { gap: 8, paddingVertical: 2, paddingRight: Spacing.sm },
  catChip: {
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: Radius.pill, borderWidth: 1,
  },
  catChipText: { fontSize: 13, fontWeight: '600' },

  // Filter row
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radius.sm, borderWidth: 1,
  },
  filterPillText: { fontSize: 12, fontWeight: '600' },

  // FAB
  fab: {
    position: 'absolute', right: 16,
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },

  // Bottom card
  cardContainer: { position: 'absolute', left: 0, right: 0 },
});
