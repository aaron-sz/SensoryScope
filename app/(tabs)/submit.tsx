/**
 * Rate / Submit Screen — "Vibe Check"
 *
 * Unique mechanic: instead of sliders, each sensory category gets 5 large
 * "Vibe Tiles" (emoji + label). One tap per category, zero cognitive load.
 * All 3 picked → floating submit CTA animates up.
 *
 * Data flow is unchanged: Google Places search → Supabase place_reviews insert.
 */
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Spacing, useColors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../_layout';

// ── Score mapping: tile index → DB value (1–10 scale) ───────────────────────
const TILE_SCORES = [1, 3, 5, 7, 10] as const;

// ── Color ramp: calm → intense (index-matched to TILE_SCORES) ───────────────
const TILE_COLORS = ['#3ab98f', '#7ec87e', '#ce9b43', '#e07040', '#d74c64'];

// ── Category definitions ─────────────────────────────────────────────────────
const CATEGORIES = [
  {
    key: 'sound' as const,
    label: 'Sound',
    icon: 'volume-2' as const,
    question: 'How loud is it right now?',
    tiles: [
      { emoji: '🤫', label: 'Silent'   },
      { emoji: '🔈', label: 'Quiet'    },
      { emoji: '🔉', label: 'Moderate' },
      { emoji: '🔊', label: 'Loud'     },
      { emoji: '📣', label: 'Intense'  },
    ],
  },
  {
    key: 'light' as const,
    label: 'Light',
    icon: 'sun' as const,
    question: 'How bright is the lighting?',
    tiles: [
      { emoji: '🌑', label: 'Dark'     },
      { emoji: '🌤️', label: 'Dim'      },
      { emoji: '☀️', label: 'Bright'   },
      { emoji: '✨', label: 'Vivid'    },
      { emoji: '🌟', label: 'Blinding' },
    ],
  },
  {
    key: 'crowd' as const,
    label: 'Crowd',
    icon: 'users' as const,
    question: 'How busy is the space?',
    tiles: [
      { emoji: '🌿', label: 'Empty'  },
      { emoji: '🧍', label: 'Sparse' },
      { emoji: '👥', label: 'Some'   },
      { emoji: '🏃', label: 'Busy'   },
      { emoji: '🎉', label: 'Packed' },
    ],
  },
] as const;

// ── Types ────────────────────────────────────────────────────────────────────
type CategoryKey = (typeof CATEGORIES)[number]['key'];
type Picks = Record<CategoryKey, number | null>;

type PlaceResult = {
  place_id: string;
  name: string;
  formatted_address?: string;
  distance_mi?: number;
};

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

// ── Main screen ──────────────────────────────────────────────────────────────
export default function SubmitScreen() {
  const { session } = useAuth();
  const C = useColors();
  const insets = useSafeAreaInsets();

  const [picks, setPicks] = useState<Picks>({ sound: null, light: null, crowd: null });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Location
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allPicked = CATEGORIES.every((c) => picks[c.key] !== null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLat(loc.coords.latitude);
        setUserLng(loc.coords.longitude);
      } catch {
        // Location unavailable — search still works without bias
      }
    })();
  }, []);

  const searchPlaces = useCallback(
    async (query: string) => {
      const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!API_KEY || !query.trim()) { setSearchResults([]); return; }
      try {
        let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${API_KEY}`;
        if (userLat != null && userLng != null) url += `&location=${userLat},${userLng}&radius=30000`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.results) {
          const enriched: PlaceResult[] = json.results.map((p: any) => ({
            place_id: p.place_id,
            name: p.name,
            formatted_address: p.formatted_address,
            distance_mi:
              userLat != null && userLng != null && p.geometry?.location
                ? distanceMiles(userLat, userLng, p.geometry.location.lat, p.geometry.location.lng)
                : undefined,
          }));
          enriched.sort((a, b) => (a.distance_mi ?? Infinity) - (b.distance_mi ?? Infinity));
          setSearchResults(enriched.slice(0, 8));
        }
      } catch {
        // Search failed silently
      }
    },
    [userLat, userLng],
  );

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(() => searchPlaces(searchQuery), 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery, searchPlaces]);

  const selectPlace = (place: PlaceResult) => {
    setSelectedPlace(place);
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
    Haptics.selectionAsync();
  };

  const submitReview = async () => {
    if (!session) {
      Alert.alert('Sign in required', 'Head to the Profile tab to sign in before submitting.');
      return;
    }
    if (!selectedPlace) {
      Alert.alert('Select a location', 'Search and choose a place first.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('place_reviews').insert({
      place_id: selectedPlace.place_id,
      place_name: selectedPlace.name,
      user_id: session.user.id,
      sound_rating: picks.sound,
      light_rating: picks.light,
      crowd_rating: picks.crowd,
      comment: '',
    });
    setLoading(false);
    if (error) { Alert.alert('Submission failed', error.message); return; }
    setSuccess(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      setSuccess(false);
      setPicks({ sound: null, light: null, crowd: null });
      setSelectedPlace(null);
    }, 2500);
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: 160 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(380)}>
          <Text style={[styles.screenTitle, { color: C.text }]}>Vibe Check</Text>
          <Text style={[styles.screenSub, { color: C.textMuted }]}>
            Share what this space feels like right now
          </Text>
        </Animated.View>

        {/* Location picker */}
        <Animated.View entering={FadeInDown.delay(60).duration(380)} style={styles.locationSection}>
          <LocationPicker
            selected={selectedPlace}
            query={searchQuery}
            results={searchResults}
            onChangeQuery={setSearchQuery}
            onSelect={selectPlace}
            onClear={() => { setSelectedPlace(null); setSearchQuery(''); }}
            C={C}
          />
        </Animated.View>

        {/* Category cards */}
        {CATEGORIES.map((cat, i) => (
          <Animated.View
            key={cat.key}
            entering={FadeInDown.delay(120 + i * 70).duration(380)}
            style={styles.cardSpacing}
          >
            <CategoryCard
              category={cat}
              selected={picks[cat.key]}
              onPick={(score) => {
                setPicks((p) => ({ ...p, [cat.key]: score }));
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              C={C}
            />
          </Animated.View>
        ))}

        {/* Progress hint */}
        <Animated.View entering={FadeInDown.delay(380).duration(380)} style={styles.progressRow}>
          {CATEGORIES.map((cat) => (
            <View
              key={cat.key}
              style={[
                styles.progressDot,
                {
                  backgroundColor: picks[cat.key] !== null
                    ? TILE_COLORS[TILE_SCORES.indexOf(picks[cat.key] as any)]
                    : C.border,
                },
              ]}
            />
          ))}
          <Text style={[styles.progressLabel, { color: C.textDim }]}>
            {CATEGORIES.filter((c) => picks[c.key] !== null).length} / 3 rated
          </Text>
        </Animated.View>
      </ScrollView>

      {/* Floating submit CTA — appears when all 3 are picked */}
      {allPicked && (
        <Animated.View
          entering={FadeInUp.springify().damping(22).stiffness(300)}
          exiting={FadeOut.duration(180)}
          style={[
            styles.submitWrap,
            { paddingBottom: Math.max(insets.bottom, Spacing.md) + 72 },
          ]}
        >
          <Pressable
            style={[styles.submitBtn, { backgroundColor: '#3ab98f', opacity: loading ? 0.7 : 1 }]}
            onPress={submitReview}
            disabled={loading}
          >
            <Feather name={loading ? 'loader' : 'send'} size={18} color="#fff" />
            <Text style={styles.submitText}>{loading ? 'Submitting…' : 'Submit Vibe'}</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Success overlay */}
      {success && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={[StyleSheet.absoluteFill, styles.successOverlay, { backgroundColor: C.bg }]}
        >
          <Text style={styles.successEmoji}>🌿</Text>
          <Text style={[styles.successTitle, { color: C.text }]}>Vibe Shared!</Text>
          <Text style={[styles.successSub, { color: C.textMuted }]}>
            Thanks for helping the community find their calm
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

// ── Location Picker ──────────────────────────────────────────────────────────
function LocationPicker({
  selected,
  query,
  results,
  onChangeQuery,
  onSelect,
  onClear,
  C,
}: {
  selected: PlaceResult | null;
  query: string;
  results: PlaceResult[];
  onChangeQuery: (q: string) => void;
  onSelect: (p: PlaceResult) => void;
  onClear: () => void;
  C: ReturnType<typeof useColors>;
}) {
  const showResults = query.trim().length > 0 && results.length > 0;

  if (selected) {
    return (
      <View style={[styles.selectedChip, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={[styles.selectedIconWrap, { backgroundColor: C.elevated }]}>
          <Feather name="map-pin" size={14} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.selectedName, { color: C.text }]} numberOfLines={1}>
            {selected.name}
          </Text>
          {selected.formatted_address && (
            <Text style={[styles.selectedAddr, { color: C.textMuted }]} numberOfLines={1}>
              {selected.formatted_address}
            </Text>
          )}
        </View>
        <Pressable onPress={onClear} hitSlop={12} style={styles.clearBtn}>
          <Feather name="x" size={16} color={C.textDim} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ zIndex: 10 }}>
      <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Feather name="search" size={16} color={C.textDim} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          placeholder="Search for a place…"
          placeholderTextColor={C.textDim}
          value={query}
          onChangeText={onChangeQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => onChangeQuery('')} hitSlop={10}>
            <Feather name="x-circle" size={16} color={C.textDim} />
          </Pressable>
        )}
      </View>

      {showResults && (
        <View style={[styles.resultsBox, { backgroundColor: C.elevated, borderColor: C.border }]}>
          {results.map((place, i) => (
            <TouchableOpacity
              key={place.place_id}
              onPress={() => onSelect(place)}
              activeOpacity={0.7}
              style={[
                styles.resultRow,
                i < results.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
              ]}
            >
              <Feather name="map-pin" size={14} color={C.textDim} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.resultName, { color: C.text }]} numberOfLines={1}>
                  {place.name}
                </Text>
                {place.formatted_address && (
                  <Text style={[styles.resultAddr, { color: C.textMuted }]} numberOfLines={1}>
                    {place.formatted_address}
                  </Text>
                )}
              </View>
              {place.distance_mi != null && (
                <Text style={[styles.resultDist, { color: C.accent }]}>
                  {place.distance_mi.toFixed(1)} mi
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Category Card ────────────────────────────────────────────────────────────
function CategoryCard({
  category,
  selected,
  onPick,
  C,
}: {
  category: (typeof CATEGORIES)[number];
  selected: number | null;
  onPick: (score: number) => void;
  C: ReturnType<typeof useColors>;
}) {
  const selectedIdx = selected !== null ? TILE_SCORES.indexOf(selected as any) : -1;
  const accentColor = selectedIdx >= 0 ? TILE_COLORS[selectedIdx] : C.textDim;

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconWrap, { backgroundColor: C.elevated }]}>
          <Feather name={category.icon} size={16} color={accentColor} />
        </View>
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={[styles.cardLabel, { color: C.text }]}>{category.label}</Text>
          <Text style={[styles.cardQuestion, { color: C.textMuted }]}>{category.question}</Text>
        </View>
        {selected !== null && (
          <View style={[styles.doneChip, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
            <Feather name="check" size={12} color={accentColor} />
            <Text style={[styles.doneText, { color: accentColor }]}>Done</Text>
          </View>
        )}
      </View>

      {/* Vibe tiles */}
      <View style={styles.tileRow}>
        {category.tiles.map((tile, i) => {
          const score = TILE_SCORES[i];
          return (
            <VibeTile
              key={i}
              emoji={tile.emoji}
              label={tile.label}
              color={TILE_COLORS[i]}
              isSelected={selected === score}
              onPress={() => onPick(score)}
              C={C}
            />
          );
        })}
      </View>
    </View>
  );
}

// ── Vibe Tile ────────────────────────────────────────────────────────────────
function VibeTile({
  emoji,
  label,
  color,
  isSelected,
  onPress,
  C,
}: {
  emoji: string;
  label: string;
  color: string;
  isSelected: boolean;
  onPress: () => void;
  C: ReturnType<typeof useColors>;
}) {
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(isSelected ? 1 : 0);
  const borderOpacity = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    bgOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
    borderOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
    scale.value = withSpring(isSelected ? 1.06 : 1, { damping: 16, stiffness: 320, mass: 0.5 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelected]);

  const tileAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgAnim = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  return (
    <Pressable style={styles.tilePressable} onPress={onPress}>
      <Animated.View
        style={[
          styles.tileInner,
          {
            borderColor: isSelected ? color : C.border,
            backgroundColor: C.elevated,
          },
          tileAnim,
        ]}
      >
        {/* Color fill background */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: color + '25', borderRadius: Radius.md },
            bgAnim,
          ]}
        />
        <Text style={styles.tileEmoji}>{emoji}</Text>
        <Text
          style={[
            styles.tileLabel,
            { color: isSelected ? color : C.textDim },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
  },

  // Header
  screenTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  screenSub: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },

  // Location section
  locationSection: {
    marginBottom: Spacing.lg,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: Spacing.sm,
  },
  selectedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectedAddr: {
    fontSize: 12,
    marginTop: 1,
  },
  clearBtn: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  resultsBox: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultAddr: {
    fontSize: 12,
    marginTop: 2,
  },
  resultDist: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  // Card
  cardSpacing: {
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardQuestion: {
    fontSize: 12,
    marginTop: 1,
  },
  doneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  doneText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Tiles
  tileRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tilePressable: {
    flex: 1,
  },
  tileInner: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 5,
  },
  tileEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  tileLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // Progress dots
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },

  // Floating submit
  submitWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 54,
    borderRadius: Radius.lg,
    shadowColor: '#3ab98f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Success overlay
  successOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  successSub: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 22,
  },
});
