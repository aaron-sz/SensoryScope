/**
 * Submit / Rating Screen
 *
 * Fully redesigned with:
 *  - Dark gradient background
 *  - Live sensory score preview cards that update as sliders move
 *  - Custom AnimatedSlider components (gradient track, haptic ticks)
 *  - Staggered FadeInDown entrance animations for each section
 *  - Location picker overlay (RNEUI) + "Find Nearest" GPS button
 *  - Submit button with loading → success animation
 *  - Supabase review insert + location average recalculation
 */
import { Ionicons } from '@expo/vector-icons';
import { Button, Overlay, Text as RNEText } from '@rneui/themed';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

export default function SubmitScreen() {
  const { session } = useAuth();

  const [locations, setLocations] = useState<any[]>([]);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [success, setSuccess] = useState(false);

  const [scores, setScores] = useState<ScoreState>({ sound: 5, light: 5, crowd: 5 });

  useEffect(() => { fetchLocations(); }, []);

  const fetchLocations = async () => {
    const { data, error } = await supabase.from('locations').select('*');
    if (error) {
      console.error('Error fetching locations:', error.code, '|', error.message, '|', error.details, '|', error.hint);
    }
    if (data) setLocations(data);
  };

  const setScore = (key: keyof ScoreState) => (val: number) =>
    setScores((prev) => ({ ...prev, [key]: val }));

  const findNearest = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is needed to find the nearest spot.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      const withCoords = locations.map((l) => {
        let lat = 0, lon = 0;
        if (l.coords?.coordinates) { lon = l.coords.coordinates[0]; lat = l.coords.coordinates[1]; }
        return { ...l, lat, lon };
      });

      withCoords.sort((a, b) => {
        const dA = Math.hypot(a.lat - latitude, a.lon - longitude);
        const dB = Math.hypot(b.lat - latitude, b.lon - longitude);
        return dA - dB;
      });

      if (withCoords.length > 0) {
        setLocationId(withCoords[0].id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Nearest location', `Selected: ${withCoords[0].name}`);
      } else {
        Alert.alert('No locations', 'No locations found in the database yet.');
      }
    } catch (e) {
      console.warn('Could not get location:', e);
      Alert.alert('Location unavailable', 'Make sure location services are enabled.');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!session) {
      Alert.alert('Sign in required', 'Head to the Profile tab to sign in before submitting.');
      return;
    }
    if (!locationId) {
      Alert.alert('Select a location', 'Choose a location above before submitting.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('reviews').insert({
      location_id: locationId,
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

    // Recalculate averages for this location
    const { data: reviews } = await supabase
      .from('reviews')
      .select('sound_rating, light_rating, crowd_rating')
      .eq('location_id', locationId);

    if (reviews && reviews.length > 0) {
      const count = reviews.length;
      const avg = (key: string) =>
        reviews.reduce((acc: number, r: any) => acc + (r[key] ?? 0), 0) / count;

      await supabase.from('locations').update({
        avg_sound: avg('sound_rating'),
        avg_light: avg('light_rating'),
        avg_crowd: avg('crowd_rating'),
        review_count: count,
      }).eq('id', locationId);
    }

    setLoading(false);
    setSuccess(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setTimeout(() => {
      setSuccess(false);
      setScores({ sound: 5, light: 5, crowd: 5 });
      setLocationId(null);
    }, 2200);
  };

  const selectedName = locations.find((l) => l.id === locationId)?.name ?? null;
  const overallPreview = ((scores.sound + scores.light + scores.crowd) / 3).toFixed(1);

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

        {/* ── Location picker ── */}
        <Animated.View entering={FadeInDown.delay(160).springify().damping(20)} style={styles.section}>
          <Text style={styles.sectionLabel}>Location</Text>
          <View style={styles.locationRow}>
            <Pressable
              style={[styles.locationBtn, selectedName ? styles.locationBtnActive : null]}
              onPress={() => setPickerVisible(true)}
            >
              <Ionicons
                name="location"
                size={16}
                color={selectedName ? Colors.primaryLight : Colors.textMuted}
              />
              <Text
                style={[styles.locationBtnText, selectedName ? styles.locationBtnTextActive : null]}
                numberOfLines={1}
              >
                {selectedName ?? 'Choose location…'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={Colors.textDim} />
            </Pressable>

            <Pressable style={styles.nearestBtn} onPress={findNearest} disabled={loading}>
              <Ionicons name="navigate" size={16} color={Colors.accent} />
            </Pressable>
          </View>
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

      {/* ── Location picker overlay ── */}
      <Overlay
        isVisible={pickerVisible}
        onBackdropPress={() => setPickerVisible(false)}
        overlayStyle={styles.overlay}
      >
        <View>
          <RNEText h4 style={styles.overlayTitle}>Select Location</RNEText>
          <ScrollView style={styles.overlayList} showsVerticalScrollIndicator={false}>
            {locations.map((l) => (
              <Pressable
                key={l.id}
                style={styles.listItem}
                onPress={() => {
                  setLocationId(l.id);
                  setPickerVisible(false);
                  Haptics.selectionAsync();
                }}
              >
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>{l.name}</Text>
                  {!!l.description && (
                    <Text style={styles.listItemSub} numberOfLines={1}>
                      {l.description}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
              </Pressable>
            ))}
            {locations.length === 0 && (
              <Text style={styles.emptyOverlay}>No locations loaded yet.</Text>
            )}
          </ScrollView>
          <Button
            title="Cancel"
            type="clear"
            onPress={() => setPickerVisible(false)}
            titleStyle={{ color: Colors.textMuted }}
            containerStyle={{ marginTop: Spacing.sm }}
          />
        </View>
      </Overlay>
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

  // Location row
  locationRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  locationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
  },
  locationBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.elevated,
  },
  locationBtnText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 14,
  },
  locationBtnTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  nearestBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Overlay / picker
  overlay: {
    width: '88%',
    maxHeight: '70%',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  overlayTitle: {
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
    fontSize: 18,
  },
  overlayList: { maxHeight: 360 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  listItemSub: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  emptyOverlay: {
    textAlign: 'center',
    color: Colors.textMuted,
    marginTop: Spacing.lg,
    fontSize: 14,
  },
});
