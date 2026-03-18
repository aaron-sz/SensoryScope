/**
 * MapHeader — Header overlay for the map screen.
 * Includes app name, place stats, refresh, filter bar, and place search.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Radius, Spacing, useColors } from '../../constants/theme';
import MapFilterBar from './MapFilterBar';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export type SearchResult = {
  place_id: string;
  name: string;
  formatted_address?: string;
  lat: number;
  lng: number;
};

interface MapHeaderProps {
  topInset: number;
  totalCount: number;
  ratedCount: number;
  loading: boolean;
  activeFilter: string;
  onFilterChange: (key: string) => void;
  onRefresh: () => void;
  /** Called when the user picks a search result */
  onSearchSelect?: (result: SearchResult) => void;
  /** User coords for biasing search results */
  userLat?: number | null;
  userLng?: number | null;
}

const MapHeader = memo(function MapHeader({
  topInset,
  totalCount,
  ratedCount,
  loading,
  activeFilter,
  onFilterChange,
  onRefresh,
  onSearchSelect,
  userLat,
  userLng,
}: MapHeaderProps) {
  const C = useColors();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const subtitle = loading
    ? 'Finding places nearby…'
    : `${totalCount} places · ${ratedCount} rated`;

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery('');
    setResults([]);
    Keyboard.dismiss();
  }, []);

  const search = useCallback((text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!text.trim()) { setResults([]); return; }

    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      try {
        let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(text)}&key=${API_KEY}`;
        if (userLat != null && userLng != null) {
          url += `&location=${userLat},${userLng}&radius=30000`;
        }
        const res = await fetch(url, { signal: abortRef.current.signal });
        const json = await res.json();
        if (json.results) {
          setResults(
            json.results.slice(0, 5).map((p: any) => ({
              place_id: p.place_id,
              name: p.name,
              formatted_address: p.formatted_address,
              lat: p.geometry?.location?.lat,
              lng: p.geometry?.location?.lng,
            })),
          );
        }
      } catch {
        // Aborted or network error
      }
    }, 300);
  }, [userLat, userLng]);

  const handleSelect = useCallback((result: SearchResult) => {
    onSearchSelect?.(result);
    closeSearch();
  }, [onSearchSelect, closeSearch]);

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
            onPress={openSearch}
            style={[styles.iconBtn, { backgroundColor: C.accentGlow }]}
            hitSlop={12}
            accessibilityLabel="Search places"
          >
            <Ionicons name="search" size={18} color={C.accent} />
          </Pressable>
          <Pressable
            onPress={onRefresh}
            style={[styles.iconBtn, { backgroundColor: C.accentGlow }]}
            hitSlop={12}
            accessibilityLabel="Refresh places"
          >
            <Ionicons name="refresh" size={18} color={C.accent} />
          </Pressable>
        </View>

        {/* Search bar (expandable) */}
        {searchOpen && (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={styles.searchContainer}
          >
            <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Ionicons name="search" size={16} color={C.textDim} />
              <TextInput
                ref={inputRef}
                style={[styles.searchInput, { color: C.text }]}
                placeholder="Search for a place…"
                placeholderTextColor={C.textDim}
                value={query}
                onChangeText={search}
                returnKeyType="search"
                autoCorrect={false}
              />
              <Pressable onPress={closeSearch} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={C.textDim} />
              </Pressable>
            </View>

            {/* Results dropdown */}
            {results.length > 0 && (
              <View style={[styles.results, { backgroundColor: C.elevated, borderColor: C.border }]}>
                {results.map((r) => (
                  <Pressable
                    key={r.place_id}
                    style={({ pressed }) => [
                      styles.resultRow,
                      pressed && { backgroundColor: C.accentGlow },
                    ]}
                    onPress={() => handleSelect(r)}
                  >
                    <Ionicons name="location-outline" size={16} color={C.accent} />
                    <View style={styles.resultText}>
                      <Text style={[styles.resultName, { color: C.text }]} numberOfLines={1}>
                        {r.name}
                      </Text>
                      {r.formatted_address && (
                        <Text style={[styles.resultAddr, { color: C.textMuted }]} numberOfLines={1}>
                          {r.formatted_address}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* Filter bar */}
        {!searchOpen && (
          <MapFilterBar activeKey={activeFilter} onChange={onFilterChange} />
        )}
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
    gap: Spacing.xs,
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  results: {
    marginTop: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultAddr: {
    fontSize: 11,
    marginTop: 1,
  },
});
