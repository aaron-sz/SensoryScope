/**
 * Submit / Rating Screen
 *
 * Fully redesigned with:
 *  - Google Places search to find any location
 *  - Live sensory score preview cards that update as sliders move
 *  - Custom AnimatedSlider components (gradient track, haptic ticks)
 *  - Staggered FadeInDown entrance animations for each section
 *  - Submit button with loading → success animation
 *  - Writes to Supabase `place_reviews` table (linked by Google place_id)
 */
import { Ionicons } from '@expo/vector-icons';
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
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AnimatedSlider from '../../components/ui/AnimatedSlider';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../_layout';

/* Sensory category config — drives slider gradient + label */
const CATEGORIES = [
  {
    key: 'sound' as const,
    label: 'Sound Level',
    leftLabel: 'Quiet',
    rightLabel: 'Loud',
    gradientColors: ['#34D399', '#FBBF24', '#F87171'] as [string, string, string],
    icon: 'volume-medium' as const,
  },
  {
    key: 'light' as const,
    label: 'Light Level',
    leftLabel: 'Dim',
    rightLabel: 'Bright',
    gradientColors: ['#22D3EE', '#FBBF24', '#F87171'] as [string, string, string],
    icon: 'sunny' as const,
  },
  {
    key: 'crowd' as const,
    label: 'Crowd Level',
    leftLabel: 'Empty',
    rightLabel: 'Packed',
    gradientColors: ['#34D399', '#FBBF24', '#F87171'] as [string, string, string],
    icon: 'people' as const,
  },
];

type ScoreState = { sound: number; light: number; crowd: number };

type PlaceResult = {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
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

export default function SubmitScreen() {
  const { session } = useAuth();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // User location
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  // Selected place (from Google Places search)
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [scores, setScores] = useState<ScoreState>({ sound: 5, light: 5, crowd: 5 });

  // Get user location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLat(loc.coords.latitude);
        setUserLng(loc.coords.longitude);
      } catch (e) {
        console.warn('Could not get location:', e);
      }
    })();
  }, []);

  const setScore = (key: keyof ScoreState) => (val: number) =>
    setScores((prev) => ({ ...prev, [key]: val }));

  // Debounced Google Places search
  const searchPlaces = useCallback(async (query: string) => {
    const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!API_KEY || !query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${API_KEY}`;
      // Bias results near the user
      if (userLat != null && userLng != null) {
        url += `&location=${userLat},${userLng}&radius=30000`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.results) {
        const enriched: PlaceResult[] = json.results.map((p: any) => ({
          place_id: p.place_id,
          name: p.name,
          formatted_address: p.formatted_address,
          vicinity: p.vicinity,
          distance_mi:
            userLat != null && userLng != null && p.geometry?.location
              ? distanceMiles(userLat, userLng, p.geometry.location.lat, p.geometry.location.lng)
              : undefined,
        }));
        // Sort nearest first
        enriched.sort((a, b) => (a.distance_mi ?? Infinity) - (b.distance_mi ?? Infinity));
        setSearchResults(enriched.slice(0, 8));
      }
    } catch (e) {
      console.warn('Place search error:', e);
    }
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimerRef.current = setTimeout(() => searchPlaces(searchQuery), 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, searchPlaces]);

  const selectPlace = (place: PlaceResult) => {
    setSelectedPlace(place);
    setSearchQuery('');
    setSearchResults([]);
    Keyboard.dismiss();
    Haptics.selectionAsync();
  };

  const clearPlace = () => {
    setSelectedPlace(null);
    setSearchQuery('');
  };

  const submitReview = async () => {
    if (!session) {
      Alert.alert('Sign in required', 'Head to the Profile tab to sign in before submitting.');
      return;
    }
    if (!selectedPlace) {
      Alert.alert('Select a location', 'Search and choose a place before submitting.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('place_reviews').insert({
      place_id: selectedPlace.place_id,
      place_name: selectedPlace.name,
      user_id: session.user.id,
      sound_rating: scores.sound,
      light_rating: scores.light,
      crowd_rating: scores.crowd,
      comment: '',
    });

    if (error) {
      Alert.alert('Submission error', error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccess(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setTimeout(() => {
      setSuccess(false);
      setScores({ sound: 5, light: 5, crowd: 5 });
      setSelectedPlace(null);
    }, 2200);
  };

  const overallPreview = ((scores.sound + scores.light + scores.crowd) / 3).toFixed(1);
  const showResults = searchQuery.trim().length > 0 && searchResults.length > 0;

  return (
    <LinearGradient
      colors={[Colors.bg, Colors.surface, Colors.bg]}
      style={styles.gradient}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Title ── */}
        <Animated.View entering={FadeInDown.delay(0).springify().damping(20)}>
          <Text style={styles.screenTitle}>Rate a Place</Text>
          <Text style={styles.screenSub}>Help others find sensory-friendly spaces</Text>
        </Animated.View>

        {/* ── Live score preview ── */}
        <Animated.View entering={FadeInDown.delay(80).springify().damping(20)} style={styles.previewRow}>
          {CATEGORIES.map((cat) => (
            <ScoreCard
              key={cat.key}
              icon={cat.icon}
              label={cat.label.split(' ')[0]}
              value={scores[cat.key]}
            />
          ))}
          {/* Overall */}
          <View style={[styles.scoreCard, styles.overallCard]}>
            <Text style={styles.overallValue}>{overallPreview}</Text>
            <Text style={styles.scoreCardLabel}>Overall</Text>
          </View>
        </Animated.View>

        {/* ── Location Search ── */}
        <Animated.View entering={FadeInDown.delay(160).springify().damping(20)} style={styles.section}>
          <Text style={styles.sectionLabel}>Location</Text>

          {selectedPlace ? (
            /* Selected place display */
            <View style={styles.selectedPlaceRow}>
              <View style={styles.selectedPlaceInfo}>
                <View style={styles.selectedPlaceIcon}>
                  <Ionicons name="location" size={18} color={Colors.primaryLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedPlaceName} numberOfLines={1}>
                    {selectedPlace.name}
                  </Text>
                  {!!(selectedPlace.formatted_address || selectedPlace.vicinity) && (
                    <Text style={styles.selectedPlaceAddress} numberOfLines={1}>
                      {selectedPlace.formatted_address || selectedPlace.vicinity}
                    </Text>
                  )}
                </View>
              </View>
              <Pressable onPress={clearPlace} style={styles.clearBtn} hitSlop={10}>
                <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            /* Search input */
            <View style={styles.searchContainer}>
              <View style={[styles.searchBar, searchQuery.length > 0 && styles.searchBarFocused]}>
                <Ionicons
                  name="search"
                  size={18}
                  color={searchQuery.length > 0 ? Colors.primaryLight : Colors.textMuted}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for any place..."
                  placeholderTextColor={Colors.textDim}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
                    <Ionicons name="close-circle" size={18} color={Colors.textDim} />
                  </Pressable>
                )}
              </View>

              {/* Search results dropdown */}
              {showResults && (
                <View style={styles.resultsDropdown}>
                  {searchResults.map((place) => (
                    <TouchableOpacity
                      key={place.place_id}
                      style={styles.resultItem}
                      onPress={() => selectPlace(place)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="location-outline" size={16} color={Colors.textMuted} style={{ marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultName} numberOfLines={1}>{place.name}</Text>
                        {!!(place.formatted_address || place.vicinity) && (
                          <Text style={styles.resultAddress} numberOfLines={1}>
                            {place.formatted_address || place.vicinity}
                          </Text>
                        )}
                      </View>
                      {place.distance_mi != null && (
                        <Text style={styles.resultDistance}>{place.distance_mi.toFixed(1)} mi</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* ── Sliders ── */}
        <Animated.View entering={FadeInDown.delay(240).springify().damping(20)} style={styles.section}>
          <Text style={styles.sectionLabel}>Sensory Ratings</Text>
          {CATEGORIES.map((cat) => (
            <AnimatedSlider
              key={cat.key}
              label={cat.label}
              value={scores[cat.key]}
              onValueChange={setScore(cat.key)}
              min={1}
              max={10}
              leftLabel={cat.leftLabel}
              rightLabel={cat.rightLabel}
              gradientColors={cat.gradientColors}
            />
          ))}
        </Animated.View>

        {/* ── Submit button ── */}
        <Animated.View entering={FadeInDown.delay(320).springify().damping(20)}>
          <Pressable
            style={[
              styles.submitBtn,
              success && styles.submitBtnSuccess,
              loading && styles.submitBtnLoading,
            ]}
            onPress={submitReview}
            disabled={loading || success}
          >
            {success ? (
              <>
                <Ionicons name="checkmark-circle" size={22} color={Colors.bg} />
                <Text style={styles.submitText}>Submitted!</Text>
              </>
            ) : (
              <>
                <Ionicons name="send" size={18} color={Colors.bg} />
                <Text style={styles.submitText}>
                  {loading ? 'Submitting…' : 'Submit Review'}
                </Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

/* ---------- Score Preview Card ---------- */
function ScoreCard({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
}) {
  const color =
    value <= 3 ? Colors.calm : value <= 6 ? Colors.moderate : Colors.intense;

  return (
    <View style={[styles.scoreCard, { borderColor: color }]}>
      <Ionicons name={icon} size={14} color={color} style={{ marginBottom: 2 }} />
      <Text style={[styles.scoreCardValue, { color }]}>{value}</Text>
      <Text style={styles.scoreCardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 60,
    paddingBottom: 120,
  },

  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  screenSub: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },

  // Live score preview row
  previewRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  overallCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.elevated,
  },
  scoreCardValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  overallValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryLight,
    letterSpacing: -0.3,
  },
  scoreCardLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textDim,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Section
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: Spacing.md,
  },

  // Search bar
  searchContainer: {
    position: 'relative',
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  searchBarFocused: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.elevated,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },

  // Search results dropdown
  resultsDropdown: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 6,
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  resultAddress: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  resultDistance: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
    marginLeft: Spacing.sm,
    marginTop: 2,
  },

  // Selected place display
  selectedPlaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.elevated,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: Spacing.sm,
  },
  selectedPlaceInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selectedPlaceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPlaceName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  selectedPlaceAddress: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  clearBtn: {
    padding: 4,
  },

  // Submit button
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingVertical: 16,
    boxShadow: '0 4px 16px rgba(15,23,42,0.18)',
  },
  submitBtnSuccess: {
    backgroundColor: Colors.calm,
  },
  submitBtnLoading: {
    opacity: 0.7,
  },
  submitText: {
    color: Colors.bg,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
