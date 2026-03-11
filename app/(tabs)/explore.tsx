/**
 * Explore Screen
 * The primary tab — a searchable, categorized place directory.
 * 
 * Features:
 *  - Inline search with full PlaceCard results (photos, rating, distance)
 *  - High-accuracy GPS tracking
 *  - Multi-select Category chips (17 types)
 *  - Sort by distance / rating
 *  - Place detail sheet with reviews and deep links
 */
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlaceCard, { PlaceData } from '../../components/PlaceCard';
import PlaceDetailSheet from '../../components/PlaceDetailSheet';
import { Radius, Shadows, Spacing, useColors } from '../../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

const CATEGORIES = [
  { key: 'restaurant', label: '🍽️ Restaurants', type: 'restaurant' },
  { key: 'cafe', label: '☕ Cafes', type: 'cafe' },
  { key: 'meal_takeaway', label: '🥡 Fast Food', type: 'meal_takeaway' },
  { key: 'library', label: '📚 Libraries', type: 'library' },
  { key: 'park', label: '🌳 Parks', type: 'park' },
  { key: 'shopping_mall', label: '🛍️ Shopping', type: 'shopping_mall' },
  { key: 'gym', label: '💪 Gyms', type: 'gym' },
  { key: 'bar', label: '🍸 Bars', type: 'bar' },
  { key: 'movie_theater', label: '🎬 Theaters', type: 'movie_theater' },
  { key: 'museum', label: '🏛️ Museums', type: 'museum' },
  { key: 'supermarket', label: '🛒 Groceries', type: 'supermarket' },
  { key: 'gas_station', label: '⛽ Gas', type: 'gas_station' },
  { key: 'pharmacy', label: '💊 Pharmacy', type: 'pharmacy' },
  { key: 'lodging', label: '🏨 Hotels', type: 'lodging' },
  { key: 'school', label: '🏫 Schools', type: 'school' },
  { key: 'hospital', label: '🏥 Hospital', type: 'hospital' },
  { key: 'book_store', label: '📖 Books', type: 'book_store' },
];

const SORT_OPTIONS = ['distance', 'rating'] as const;
type SortMode = (typeof SORT_OPTIONS)[number];

const RADIUS_OPTIONS = [
  { label: '1 mi', meters: 1609 },
  { label: '5 mi', meters: 8045 },
  { label: '10 mi', meters: 16090 },
  { label: '25 mi', meters: 40225 },
];

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

export default function ExploreScreen() {
  const C = useColors();
  const insets = useSafeAreaInsets();

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [places, setPlaces] = useState<PlaceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceData | null>(null);

  // Filters
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set([CATEGORIES[0].key]));
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  const [radiusIdx, setRadiusIdx] = useState(1);
  const [openNow, setOpenNow] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search — results are full PlaceData[] so we render PlaceCards
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceData[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<TextInput>(null);

  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    initLocation();
  }, []);

  useEffect(() => {
    if (userLat != null) {
      fetchPlaces();
    }
  }, [activeCategories, radiusIdx, openNow, userLat]);

  // Debounced search — uses textsearch so we get full place data (photo, rating, etc.)
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => fetchSearchResults(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchSearchResults = async (text: string) => {
    const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!API_KEY) return;
    try {
      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(text)}&key=${API_KEY}`;
      if (userLat != null && userLng != null) {
        url += `&location=${userLat},${userLng}&radius=30000`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.results) {
        const enriched: PlaceData[] = json.results.map((p: any) => ({
          ...p,
          distance_mi: userLat != null && userLng != null
            ? distanceMiles(userLat, userLng, p.geometry.location.lat, p.geometry.location.lng)
            : undefined,
        }));
        // Sort by distance
        enriched.sort((a, b) => (a.distance_mi ?? Infinity) - (b.distance_mi ?? Infinity));
        setSearchResults(enriched);
      }
    } catch (e) { console.warn('Search error:', e); }
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const initLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUserLat(35.7796);
        setUserLng(-78.6382);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      setUserLat(loc.coords.latitude);
      setUserLng(loc.coords.longitude);
    } catch {
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        setUserLat(last.coords.latitude);
        setUserLng(last.coords.longitude);
      } else {
        setUserLat(35.7796);
        setUserLng(-78.6382);
      }
    }
  };

  const fetchPlaces = async (pageToken?: string) => {
    if (userLat == null || userLng == null) return;
    const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!API_KEY) return;

    if (!pageToken) {
      setLoading(true);
      setNextPageToken(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const radius = RADIUS_OPTIONS[radiusIdx].meters;
      const activeCats = CATEGORIES.filter(c => activeCategories.has(c.key));

      let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userLat},${userLng}&radius=${radius}&type=${activeCats[0]?.type || 'point_of_interest'}&key=${API_KEY}`;

      if (activeCategories.size > 1) {
        const keywords = activeCats.map(c => c.key).join('|');
        url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userLat},${userLng}&radius=${radius}&keyword=${encodeURIComponent(keywords)}&key=${API_KEY}`;
      }

      if (openNow) url += '&opennow=true';
      if (pageToken) url += `&pagetoken=${pageToken}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.results) {
        const enriched: PlaceData[] = json.results.map((p: any) => ({
          ...p,
          distance_mi: distanceMiles(userLat, userLng, p.geometry.location.lat, p.geometry.location.lng),
        }));

        if (pageToken) {
          setPlaces((prev) => [...prev, ...enriched]);
        } else {
          setPlaces(enriched);
        }
        setNextPageToken(json.next_page_token ?? null);
      }
    } catch (e) {
      console.warn('Explore fetch error:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const loadMore = () => {
    if (nextPageToken && !loadingMore) {
      setTimeout(() => fetchPlaces(nextPageToken), 1500);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    initLocation();
  };

  const toggleCategory = (key: string) => {
    const next = new Set(activeCategories);
    if (next.has(key)) {
      if (next.size > 1) next.delete(key);
    } else {
      next.add(key);
    }
    setActiveCategories(next);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const sortedPlaces = [...places].sort((a, b) => {
    if (sortMode === 'distance') {
      return (a.distance_mi ?? Infinity) - (b.distance_mi ?? Infinity);
    }
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  const uniquePlaces = Array.from(new Map(sortedPlaces.map(p => [p.place_id, p])).values());

  // What to show: search results or directory results
  const isSearching = searchOpen && searchQuery.trim().length > 0;
  const displayData = isSearching ? searchResults : uniquePlaces;

  const renderPlaceCard = useCallback(
    ({ item }: { item: PlaceData }) => (
      <PlaceCard place={item} onPress={setSelectedPlace} />
    ),
    []
  );

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: C.bg }]}>
        <Text style={[styles.title, { color: C.text }]}>Explore</Text>
        <Text style={[styles.subtitle, { color: C.textMuted }]}>
          Discover sensory-friendly places near you
        </Text>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Pressable
            style={[styles.searchBar, { backgroundColor: C.elevated, borderColor: searchOpen ? C.accent : C.border }]}
            onPress={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 30); }}
          >
            <Ionicons name="search" size={18} color={searchOpen ? C.accent : C.textMuted} />
            <TextInput
              ref={searchRef}
              style={[styles.searchInput, { color: C.text }]}
              placeholder="Search any place..."
              placeholderTextColor={C.textDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
              editable={searchOpen}
              pointerEvents={searchOpen ? 'auto' : 'none'}
              returnKeyType="search"
              onFocus={() => setSearchOpen(true)}
            />
            {searchOpen && (
              <Pressable onPress={closeSearch} hitSlop={10}>
                <Ionicons name="close-circle" size={20} color={C.textMuted} />
              </Pressable>
            )}
          </Pressable>
        </View>

        {/* Categories & Filters — hidden while searching or viewing detail */}
        {!searchOpen && !selectedPlace && (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {CATEGORIES.map((cat) => {
                const isActive = activeCategories.has(cat.key);
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => toggleCategory(cat.key)}
                    style={[
                      styles.catChip,
                      { backgroundColor: isActive ? C.accent : C.surface, borderColor: isActive ? C.accent : C.border },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.catChipText, { color: isActive ? '#fff' : C.text }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.filterBar}>
              <TouchableOpacity
                style={[styles.filterBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setSortMode((m) => (m === 'distance' ? 'rating' : 'distance'))}
              >
                <Ionicons
                  name={sortMode === 'distance' ? 'swap-vertical' : 'star'}
                  size={14}
                  color={C.accent}
                />
                <Text style={[styles.filterBtnText, { color: C.text }]}>
                  {sortMode === 'distance' ? 'Nearest' : 'Top Rated'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => setRadiusIdx((i) => (i + 1) % RADIUS_OPTIONS.length)}
              >
                <Ionicons name="resize" size={14} color={C.accent} />
                <Text style={[styles.filterBtnText, { color: C.text }]}>
                  {RADIUS_OPTIONS[radiusIdx].label}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  {
                    backgroundColor: openNow ? C.accent + '22' : C.surface,
                    borderColor: openNow ? C.accent : C.border,
                  },
                ]}
                onPress={() => setOpenNow((o) => !o)}
              >
                <Text style={[styles.filterBtnText, { color: openNow ? C.accent : C.text }]}>
                  Open Now
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── Main Content ── */}
      {!searchOpen && loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={[styles.loadingText, { color: C.textMuted }]}>Finding places...</Text>
        </View>
      ) : displayData.length === 0 && !isSearching ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color={C.textDim} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>
            No places found. Try expanding the radius or changing selected categories.
          </Text>
        </View>
      ) : displayData.length === 0 && isSearching ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color={C.textDim} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>No results yet...</Text>
        </View>
      ) : (
        <FlatList
          ref={isSearching ? undefined : listRef}
          data={displayData}
          renderItem={renderPlaceCard}
          keyExtractor={(item) => item.place_id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            !isSearching ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
            ) : undefined
          }
          onEndReached={!isSearching ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore && !isSearching ? (
              <ActivityIndicator size="small" color={C.accent} style={{ marginVertical: 20 }} />
            ) : null
          }
        />
      )}

      {selectedPlace && (
        <PlaceDetailSheet
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
    gap: 2,
    zIndex: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 6,
    paddingRight: Spacing.md,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 2,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Search
  searchWrapper: {
    marginTop: 2,
    marginBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    ...Shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
});
