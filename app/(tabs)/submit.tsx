/**
 * Rate / Submit Screen — "Vibe Check"
 * 1–10 dot scale per category. Tap any dot to set the level.
 * Card tints to match the selected intensity. Large animated value readout.
 */
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeDef, earnedByCount, getNewlyEarned } from '../../constants/badges';
import { Radius, Spacing, useColors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../_layout';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Progressive emoji per category — changes every 2 values (5 distinct steps).
 * step = floor((value - 1) / 2)  →  0..4
 */
const CATEGORY_EMOJIS: Record<string, string[]> = {
  sound: ['🍃', '🔈', '🔉', '🔊', '📣'],   // leaf → soft → medium → loud → megaphone
  light: ['🌑', '🕯️',  '💡', '☀️', '🌟'],  // dark → candle → bulb → sun → blinding
  crowd: ['🧍', '👥',  '👨‍👩‍👦', '👨‍👩‍👧‍👦', '🏟️'], // alone → pair → family → big family → stadium
};

function getDynamicEmoji(key: string, value: number | null): string | null {
  if (value === null) return null;
  const emojis = CATEGORY_EMOJIS[key];
  if (!emojis) return null;
  return emojis[Math.min(Math.floor((value - 1) / 2), emojis.length - 1)];
}

/** Returns which emoji step (0-4) a value maps to — used as animation key */
function emojiStep(value: number | null): number {
  if (value === null) return -1;
  return Math.min(Math.floor((value - 1) / 2), 4);
}

/** Color zone for a 1–10 rating value, sourced from the active theme */
function dotColor(n: number, C: ReturnType<typeof useColors>): string {
  if (n <= 3) return C.calm;
  if (n <= 6) return C.moderate;
  return C.intense;
}

/** Descriptive word for a value in a given category */
const VALUE_WORDS: Record<string, string[]> = {
  sound: ['Silent', 'Silent', 'Quiet', 'Quiet', 'Normal', 'Normal', 'Loud', 'Loud', 'Intense', 'Intense'],
  light: ['Dark', 'Dark', 'Dim', 'Dim', 'Bright', 'Bright', 'Vivid', 'Vivid', 'Glaring', 'Blinding'],
  crowd: ['Empty', 'Empty', 'Sparse', 'Sparse', 'Some', 'Some', 'Busy', 'Busy', 'Packed', 'Packed'],
};

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    key: 'sound' as const,
    label: 'Sound',
    icon: 'volume-2' as const,
    question: 'How loud is it right now?',
    leftLabel: 'Silent',
    rightLabel: 'Intense',
  },
  {
    key: 'light' as const,
    label: 'Light',
    icon: 'sun' as const,
    question: 'How bright is the lighting?',
    leftLabel: 'Dark',
    rightLabel: 'Blinding',
  },
  {
    key: 'crowd' as const,
    label: 'Crowd',
    icon: 'users' as const,
    question: 'How busy is it?',
    leftLabel: 'Empty',
    rightLabel: 'Packed',
  },
] as const;

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

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SubmitScreen() {
  const { session } = useAuth();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const hPad = isTablet ? Math.max(Spacing.lg, (width - 640) / 2) : Spacing.lg;

  const [picks, setPicks] = useState<Picks>({ sound: null, light: null, crowd: null });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newBadges, setNewBadges] = useState<BadgeDef[]>([]);
  const prevCountRef = useRef(0);

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const allPicked = CATEGORIES.every((c) => picks[c.key] !== null);
  const ratedCount = CATEGORIES.filter((c) => picks[c.key] !== null).length;

  // Stable handler — prevents CategoryCard from re-rendering when sibling categories change
  const handlePick = useCallback((key: CategoryKey, v: number) => {
    setPicks((p) => ({ ...p, [key]: v }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;
    supabase
      .from('place_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .then(({ count }) => { prevCountRef.current = count ?? 0; });
  }, [session?.user.id]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLat(loc.coords.latitude);
        setUserLng(loc.coords.longitude);
      } catch { /* silent */ }
    })();
  }, []);

  const searchPlaces = useCallback(async (query: string) => {
    const KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!KEY || !query.trim()) { setSearchResults([]); return; }
    // Cancel any previous in-flight request to prevent stale results from overwriting fresh ones
    searchAbortRef.current?.abort();
    searchAbortRef.current = new AbortController();
    const { signal } = searchAbortRef.current;
    try {
      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${KEY}`;
      if (userLat != null && userLng != null) url += `&location=${userLat},${userLng}&radius=30000`;
      const json = await (await fetch(url, { signal })).json();
      if (json.results) {
        const enriched: PlaceResult[] = json.results.map((p: any) => ({
          place_id: p.place_id, name: p.name, formatted_address: p.formatted_address,
          distance_mi: userLat != null && userLng != null && p.geometry?.location
            ? distanceMiles(userLat, userLng, p.geometry.location.lat, p.geometry.location.lng)
            : undefined,
        }));
        enriched.sort((a, b) => (a.distance_mi ?? Infinity) - (b.distance_mi ?? Infinity));
        setSearchResults(enriched.slice(0, 8));
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') { /* silent */ }
    }
  }, [userLat, userLng]);

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
    if (loading) return; // guard against rapid double-tap
    if (!session) { Alert.alert('Sign In Required', 'Head to the Profile tab to sign in first.'); return; }
    if (!selectedPlace) { Alert.alert('Where are you?', 'Search for and select a place before submitting.'); return; }
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
    if (error) { Alert.alert('Submission Failed', 'Your vibe couldn\'t be saved. Please check your connection and try again.'); return; }

    const prevCount = prevCountRef.current;
    const newCount = prevCount + 1;
    prevCountRef.current = newCount;
    const newly = getNewlyEarned(earnedByCount(prevCount), earnedByCount(newCount));
    setNewBadges(newly);
    setSuccess(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      setSuccess(false);
      setNewBadges([]);
      setPicks({ sound: null, light: null, crowd: null });
      setSelectedPlace(null);
    }, 3200);
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      {/* Very faint green wash at top — only visual accent on the background */}
      <LinearGradient
        colors={[C.calm + '14', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + Spacing.lg, paddingBottom: 160, paddingHorizontal: hPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(0).duration(400)}>
          <Text style={[styles.title, { color: C.text }]}>How does{'\n'}it feel?</Text>
          <Text style={[styles.subtitle, { color: C.textMuted }]}>
            Rate 1–10 · {ratedCount} of 3 rated
          </Text>
        </Animated.View>

        {/* Location */}
        <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.locationSection}>
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
            entering={FadeInDown.delay(100 + i * 70).duration(400)}
            style={styles.cardSpacing}
          >
            <CategoryCard
              category={cat}
              selected={picks[cat.key]}
              onPick={handlePick}
              C={C}
            />
          </Animated.View>
        ))}
      </ScrollView>

      {/* Floating submit */}
      {allPicked && (
        <Animated.View
          entering={FadeInUp.springify().damping(22).stiffness(300)}
          exiting={FadeOut.duration(180)}
          style={[styles.submitWrap, { paddingBottom: Math.max(insets.bottom, Spacing.md) + 72, paddingHorizontal: hPad }]}
        >
          <Pressable
            style={[styles.submitBtn, { opacity: loading ? 0.7 : 1, backgroundColor: C.calm, shadowColor: C.calm }]}
            onPress={submitReview}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Submit vibe check"
          >
            <Feather name={loading ? 'loader' : 'send'} size={18} color="#fff" />
            <Text style={styles.submitText}>{loading ? 'Submitting…' : 'Submit Vibe'}</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Success / badge overlay */}
      {success && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={[StyleSheet.absoluteFill, styles.successOverlay, { backgroundColor: C.bg }]}
        >
          {newBadges.length > 0 ? (
            <>
              <Text style={styles.successEmoji}>🎖️</Text>
              <Text style={[styles.successTitle, { color: C.text }]}>Badge Unlocked!</Text>
              {newBadges.map((badge) => (
                <View key={badge.id} style={[styles.badgeCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.badgeLabel, { color: C.text }]}>{badge.label}</Text>
                    <Text style={[styles.badgeDesc, { color: C.textMuted }]}>{badge.desc}</Text>
                  </View>
                </View>
              ))}
              <Text style={[styles.successSub, { color: C.textMuted }]}>Vibe shared too — thanks for helping out!</Text>
            </>
          ) : (
            <>
              <Text style={styles.successEmoji}>🌿</Text>
              <Text style={[styles.successTitle, { color: C.text }]}>Vibe Shared!</Text>
              <Text style={[styles.successSub, { color: C.textMuted }]}>Thanks for helping the community find their calm</Text>
            </>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// ── Location Picker ───────────────────────────────────────────────────────────
function LocationPicker({
  selected, query, results, onChangeQuery, onSelect, onClear, C,
}: {
  selected: PlaceResult | null; query: string; results: PlaceResult[];
  onChangeQuery: (q: string) => void; onSelect: (p: PlaceResult) => void;
  onClear: () => void; C: ReturnType<typeof useColors>;
}) {
  if (selected) {
    return (
      <View style={[styles.selectedChip, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={[styles.selectedIcon, { backgroundColor: C.elevated }]}>
          <Feather name="map-pin" size={14} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.selectedName, { color: C.text }]} numberOfLines={1}>{selected.name}</Text>
          {selected.formatted_address && (
            <Text style={[styles.selectedAddr, { color: C.textMuted }]} numberOfLines={1}>{selected.formatted_address}</Text>
          )}
        </View>
        <Pressable onPress={onClear} hitSlop={12}>
          <Feather name="x" size={16} color={C.textDim} />
        </Pressable>
      </View>
    );
  }

  const showResults = query.trim().length > 0 && results.length > 0;
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
              style={[styles.resultRow, i < results.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }]}
            >
              <Feather name="map-pin" size={14} color={C.textDim} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.resultName, { color: C.text }]} numberOfLines={1}>{place.name}</Text>
                {place.formatted_address && (
                  <Text style={[styles.resultAddr, { color: C.textMuted }]} numberOfLines={1}>{place.formatted_address}</Text>
                )}
              </View>
              {place.distance_mi != null && (
                <Text style={[styles.resultDist, { color: C.accent }]}>{place.distance_mi.toFixed(1)} mi</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Category Card ─────────────────────────────────────────────────────────────
// memo: only the card whose value changed re-renders; the other two stay frozen
const CategoryCard = React.memo(function CategoryCard({
  category, selected, onPick, C,
}: {
  category: (typeof CATEGORIES)[number];
  selected: number | null;
  onPick: (key: CategoryKey, v: number) => void;
  C: ReturnType<typeof useColors>;
}) {
  const color   = selected !== null ? dotColor(selected, C) : C.border;
  const word    = selected !== null ? (VALUE_WORDS[category.key]?.[selected - 1] ?? '') : null;
  const tint    = selected !== null ? dotColor(selected, C) + '0D' : C.surface;
  const emoji   = getDynamicEmoji(category.key, selected);
  const step    = emojiStep(selected);

  return (
    <View style={[
      styles.card,
      {
        backgroundColor: tint,
        // Individual border sides: thick colored left, hairline elsewhere
        borderTopWidth: StyleSheet.hairlineWidth,    borderTopColor: C.border,
        borderRightWidth: StyleSheet.hairlineWidth,  borderRightColor: C.border,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
        borderLeftWidth: 3,                          borderLeftColor: color,
      },
    ]}>
      {/* Header row: meta on left, live value on right */}
      <View style={styles.cardHeader}>
        <View style={styles.cardMeta}>
          <View style={styles.catLabelRow}>
            <Feather name={category.icon} size={13} color={selected !== null ? color : C.textDim} />
            <Text style={[styles.catLabel, { color: C.textMuted }]}>{category.label.toUpperCase()}</Text>
          </View>
          <Text style={[styles.catQuestion, { color: C.text }]}>{category.question}</Text>
        </View>

        {/* Animated value readout — key change triggers enter animation */}
        <View style={styles.valueBox}>
          <Animated.Text
            key={`n-${category.key}-${selected}-${step}`}
            entering={FadeInDown.duration(160)}
            style={[styles.valueNum, { color: selected !== null ? color : C.border }]}
          >
            {emoji ? `${emoji} ${selected}` : (selected ?? '—')}
          </Animated.Text>
          <Animated.Text
            key={`w-${category.key}-${selected}`}
            entering={FadeInDown.duration(180).delay(20)}
            style={[styles.valueWord, { color: selected !== null ? color : C.textDim }]}
          >
            {word?.toUpperCase() ?? 'TAP BELOW'}
          </Animated.Text>
        </View>
      </View>

      {/* 1–10 dot scale */}
      <DotRating value={selected} categoryKey={category.key} onValueChange={onPick} C={C} />

      {/* Scale end-labels */}
      <View style={styles.scaleRow}>
        <Text style={[styles.scaleLabel, { color: C.textDim }]}>{category.leftLabel}</Text>
        <Text style={[styles.scaleLabel, { color: C.textDim }]}>{category.rightLabel}</Text>
      </View>
    </View>
  );
});

// ── Dot Rating ────────────────────────────────────────────────────────────────
function DotRating({
  value, categoryKey, onValueChange, C,
}: {
  value: number | null;
  categoryKey: CategoryKey;
  onValueChange: (key: CategoryKey, v: number) => void;
  C: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.dotRow}>
      {Array.from({ length: 10 }, (_, i) => {
        const n = i + 1;
        const filled   = value !== null && n <= value;
        const isActive = value === n; // The "tip" of the fill
        const col = dotColor(n, C);
        return (
          <Pressable
            key={n}
            onPress={() => onValueChange(categoryKey, n)}
            hitSlop={13}
            style={styles.dotWrap}
            accessibilityRole="radio"
            accessibilityLabel={`Level ${n} of 10`}
            accessibilityState={{ checked: value === n }}
          >
            <View style={[
              styles.dot,
              filled
                ? { backgroundColor: col, transform: [{ scale: isActive ? 1.3 : 1 }] }
                : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.border },
            ]} />
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },
  scroll: {},

  // Header
  title: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginBottom: Spacing.lg,
  },

  // Location
  locationSection: { marginBottom: Spacing.lg },
  selectedChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  selectedIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  selectedName: { fontSize: 14, fontWeight: '700' },
  selectedAddr: { fontSize: 12, marginTop: 1 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md, height: 48,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  resultsBox: {
    borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth,
    marginTop: 6, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
  },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 13 },
  resultName: { fontSize: 14, fontWeight: '600' },
  resultAddr: { fontSize: 12, marginTop: 2 },
  resultDist: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  // Card
  cardSpacing: { marginBottom: Spacing.md },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  cardMeta: { flex: 1 },
  catLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  catLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  catQuestion: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },

  // Value display
  valueBox: { alignItems: 'flex-end', minWidth: 68 },
valueNum: { fontSize: 40, fontWeight: '800', letterSpacing: -1, lineHeight: 44 },
  valueWord: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 1 },

  // Dots
  dotRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  dotWrap: { alignItems: 'center', justifyContent: 'center', padding: 6 },
  dot: { width: 18, height: 18, borderRadius: 9 },

  // Scale labels
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleLabel: { fontSize: 11, fontWeight: '500' },

  // Submit
  submitWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: Spacing.sm },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    height: 54, borderRadius: Radius.lg,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  // Success
  successOverlay: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.xl },
  successEmoji: { fontSize: 64, marginBottom: Spacing.md },
  successTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  successSub: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginTop: Spacing.sm },
  badgeCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md, width: '100%', marginTop: Spacing.sm,
  },
  badgeEmoji: { fontSize: 32 },
  badgeLabel: { fontSize: 16, fontWeight: '700' },
  badgeDesc: { fontSize: 13, marginTop: 2 },
});
