/**
 * LocationModal — Animated Bottom Sheet
 *
 * Renders as an absolutely-positioned sheet that slides up from the
 * bottom of the map screen when a pin is tapped.
 *
 * Features:
 *  - Reanimated SlideInDown / SlideOutDown layout animations
 *  - Pan gesture: drag down > 120px dismisses the sheet
 *  - Staggered metric bar fill animations on open
 *  - Large circular sensory score display
 *  - BusynessBar: gradient popularity indicator from Google Places data
 *  - Navigate button that opens the device maps app
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Radius, Shadows, Spacing, useColors, useScoreColor } from '../constants/theme';
import { usePlaceBusyness, type BusynessLevel } from '../hooks/usePlaceBusyness';
import { supabase } from '../lib/supabase';

// ── DisplayLocation type ──────────────────────────────────────────────────────
export type DisplayLocation = {
  id: string;
  name: string;
  description?: string;
  avg_sound: number | null;
  avg_light: number | null;
  avg_crowd: number | null;
  review_count: number;
  latitude: number;
  longitude: number;
  /** Google Places place_id — used for busyness data */
  googlePlaceId?: string;
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  location: DisplayLocation;
  onClose: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────
// Matches FloatingTabBar BAR_HEIGHT
const TAB_BAR_H = 64;

export default function LocationModal({ location, onClose }: Props) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 600;
  const sheetHInset = isTablet ? Math.max(0, (width - 480) / 2) : 0;
  // Position the sheet above the tab bar + device safe area
  const sheetBottom = TAB_BAR_H + insets.bottom;
  // Cap height so the sheet never grows above the safe area top (+ 60px breathing room)
  const maxSheetHeight = height - insets.top - sheetBottom - 60;

  // ── Fetch live sensory scores from place_reviews ──────────────────────────
  // The passed-in location may have stale/null scores from the locations table.
  // Query place_reviews directly for the freshest data.
  const placeId = location.googlePlaceId ?? location.id;
  const [liveScores, setLiveScores] = useState<{
    avg_sound: number | null;
    avg_light: number | null;
    avg_crowd: number | null;
    review_count: number;
  } | null>(null);

  const fetchLiveScores = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('place_reviews')
        .select('sound_rating, light_rating, crowd_rating')
        .eq('place_id', placeId);

      if (data && data.length > 0) {
        const avg = (key: 'sound_rating' | 'light_rating' | 'crowd_rating') => {
          const vals = data.map((r: any) => r[key]).filter((v: any): v is number => v != null);
          return vals.length > 0 ? Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 10) / 10 : null;
        };
        setLiveScores({
          avg_sound: avg('sound_rating'),
          avg_light: avg('light_rating'),
          avg_crowd: avg('crowd_rating'),
          review_count: data.length,
        });
      }
    } catch {
      // Fall back to static scores from location prop
    }
  }, [placeId]);

  useEffect(() => {
    fetchLiveScores();
  }, [fetchLiveScores]);

  // Use live scores if available, fall back to passed-in location data
  const scores = {
    avg_sound: liveScores?.avg_sound ?? location.avg_sound,
    avg_light: liveScores?.avg_light ?? location.avg_light,
    avg_crowd: liveScores?.avg_crowd ?? location.avg_crowd,
    review_count: liveScores?.review_count ?? location.review_count,
  };

  let overallScore: number | null = null;
  if (scores.avg_sound !== null && scores.avg_light !== null && scores.avg_crowd !== null) {
    overallScore = (scores.avg_sound + scores.avg_light + scores.avg_crowd) / 3;
  }

  const busyness = usePlaceBusyness(location.googlePlaceId);
  const sheetY = useSharedValue(0);

  // Reset sheet position on each open
  useEffect(() => {
    sheetY.value = 0;
  }, [location.id, sheetY]);

  // Pan gesture — drag down to dismiss
  const panGesture = Gesture.Pan()
    .onChange((e) => {
      'worklet';
      if (e.translationY > 0) sheetY.value = e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      if (e.translationY > 120) {
        runOnJS(onClose)();
      } else {
        sheetY.value = withSpring(0, { damping: 28, stiffness: 320 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const handleNavigate = () => {
    const lat = location.latitude;
    const lng = location.longitude;
    const label = encodeURIComponent(location.name);
    const googleUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const nativeUrl = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    })!;

    Linking.canOpenURL(nativeUrl).then((ok) => Linking.openURL(ok ? nativeUrl : googleUrl));
  };

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* box-none lets the pan gesture through; tapping outside does nothing (expected) */}
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.duration(240).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutDown.duration(180).easing(Easing.in(Easing.quad))}
          style={[
            styles.sheet,
            { bottom: sheetBottom },
            isTablet && { left: sheetHInset, right: sheetHInset },
          ]}
        >
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.sheetInner, sheetStyle, {
              backgroundColor: C.surface,
              borderColor: C.border,
              maxHeight: maxSheetHeight,
            }]}>
              {/* Drag handle — always visible at top */}
              <View style={[styles.handle, { backgroundColor: C.border }]} />

              {/* Header row — always visible */}
              <View style={styles.header}>
                <View style={styles.headerText}>
                  <Text style={[styles.locationName, { color: C.text }]} numberOfLines={1}>
                    {location.name}
                  </Text>
                  <Text style={[styles.reviewCount, { color: C.textMuted }]}>
                    {scores.review_count ?? 0} sensory rating{scores.review_count !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: C.elevated }]}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={20} color={C.textMuted} />
                </Pressable>
              </View>

              {/* Scrollable body — scores, busyness, address */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
              >
                {!!location.description && (
                  <Text style={[styles.description, { color: C.textMuted }]} numberOfLines={2}>
                    {location.description}
                  </Text>
                )}

                <View style={styles.contentRow}>
                  <ScoreRing score={overallScore} />
                  <View style={styles.metricsColumn}>
                    <MetricBar label="Sound" value={scores.avg_sound} delay={0} />
                    <MetricBar label="Light" value={scores.avg_light} delay={80} />
                    <MetricBar label="Crowd" value={scores.avg_crowd} delay={160} />
                  </View>
                </View>

                {location.googlePlaceId != null && (
                  <BusynessBar
                    score={busyness.score}
                    level={busyness.level}
                    isOpenNow={busyness.isOpenNow}
                    loading={busyness.loading}
                  />
                )}
              </ScrollView>

              {/* Navigate CTA — always pinned at bottom */}
              <Pressable
                style={[styles.navButton, { backgroundColor: C.accent, shadowColor: C.accent }]}
                onPress={handleNavigate}
                accessibilityRole="button"
                accessibilityLabel={`Navigate to ${location.name}`}
              >
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={[styles.navText, { color: '#fff' }]}>Navigate</Text>
              </Pressable>
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── ScoreRing ─────────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number | null }) {
  const C = useColors();
  const scoreColor = useScoreColor();

  if (score === null) {
    return (
      <View
        style={[
          styles.scoreRing,
          { borderColor: C.border, backgroundColor: C.surface, ...Shadows.subtle },
        ]}
      >
        <Text style={[styles.scoreNumber, { color: C.textDim, fontSize: 16 }]}>N/A</Text>
        <Text style={[styles.scoreLabel, { color: C.textMuted }]}>No data</Text>
      </View>
    );
  }

  const color = scoreColor(score);
  const label = score <= 3 ? 'Calm' : score <= 6 ? 'Moderate' : 'Intense';

  return (
    <View style={[styles.scoreRing, { borderColor: color, backgroundColor: C.elevated, ...Shadows.card, shadowColor: color }]}>
      <Text style={[styles.scoreNumber, { color }]}>{score.toFixed(1)}</Text>
      <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
    </View>
  );
}

// ── MetricBar ─────────────────────────────────────────────────────────────────
function MetricBar({
  label,
  value,
  delay,
}: {
  label: string;
  value: number | null;
  delay: number;
}) {
  const C = useColors();
  const scoreColor = useScoreColor();

  const safeValue = value ?? 0;
  const color = value === null ? C.border : scoreColor(safeValue);
  const fill = useSharedValue(0);

  useEffect(() => {
    if (value !== null) {
      fill.value = withDelay(delay, withTiming((safeValue / 10) * 100, { duration: 600 }));
    }
    return () => {
      fill.value = 0;
    };
  }, [value, delay, fill, safeValue]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const barStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` as any }));

  return (
    <View
      style={styles.metricRow}
      accessibilityLabel={`${label}: ${value === null ? 'No data' : `${safeValue.toFixed(1)} out of 10`}`}
    >
      <Text style={[styles.metricLabel, { color: C.textMuted }]}>{label}</Text>
      <View style={[styles.trackBg, { backgroundColor: C.elevated }]}>
        <Animated.View style={[styles.trackFill, barStyle, { backgroundColor: color }]} />
      </View>
      <Text style={[styles.metricValue, { color: value === null ? C.textDim : color }]}>
        {value === null ? '-' : safeValue.toFixed(1)}
      </Text>
    </View>
  );
}

// ── BusynessBar ───────────────────────────────────────────────────────────────
const LEVEL_LABELS: Record<BusynessLevel, string> = {
  quiet: 'Quiet',
  moderate: 'Moderate',
  busy: 'Busy',
};

interface BusynessBarProps {
  score: number;
  level: BusynessLevel;
  isOpenNow: boolean | null;
  loading: boolean;
}

function BusynessBar({ score, level, isOpenNow, loading }: BusynessBarProps) {
  const C = useColors();
  // Map busyness levels to theme sensory colors: quiet→calm, moderate→moderate, busy→intense
  const levelColors: Record<BusynessLevel, string> = {
    quiet: C.calm,
    moderate: C.moderate,
    busy: C.intense,
  };
  const gradient: [string, string, string] = [C.calm, C.moderate, C.intense];

  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withTiming(score, { duration: 700 });
  }, [score, fillWidth]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const indicatorStyle = useAnimatedStyle(() => ({ left: `${fillWidth.value}%` as any }));

  if (loading) {
    return (
      <View style={styles.busynessRow}>
        <Text style={[styles.busynessHeading, { color: C.textMuted }]}>Popularity</Text>
        <ActivityIndicator size="small" color={C.textMuted} />
      </View>
    );
  }

  if (score === 0) return null;

  const levelColor = levelColors[level];
  const levelLabel = LEVEL_LABELS[level];

  return (
    <View
      style={styles.busynessContainer}
      accessibilityLabel={`Busyness: ${score}% — ${levelLabel}`}
    >
      <View style={styles.busynessRow}>
        <Text style={[styles.busynessHeading, { color: C.textMuted }]}>Popularity</Text>
        <View style={styles.busynessBadgeRow}>
          {isOpenNow !== null && (
            <Text style={[styles.openStatus, { color: isOpenNow ? C.calm : C.intense }]}>
              {isOpenNow ? 'Open now' : 'Closed'}
            </Text>
          )}
          <View style={[styles.levelBadge, { backgroundColor: levelColor + '22', borderColor: levelColor + '55' }]}>
            <Text style={[styles.levelText, { color: levelColor }]}>{levelLabel}</Text>
          </View>
        </View>
      </View>

      {/* Gradient track with animated position indicator */}
      <View style={styles.busynessTrackWrapper}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.busynessTrack}
        />
        {/* Indicator dot */}
        <Animated.View style={[styles.busynessIndicator, indicatorStyle, {
          backgroundColor: C.elevated,
          borderColor: C.text,
        }]} />
      </View>

      <View style={styles.busynessLabels}>
        <Text style={[styles.busynessEndLabel, { color: C.textMuted }]}>Quiet</Text>
        <Text style={[styles.busynessEndLabel, { color: C.textMuted }]}>Busy</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  sheetInner: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderWidth: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.pill,
    alignSelf: 'center',
    marginVertical: Spacing.sm + 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  headerText: {
    flex: 1,
  },
  locationName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  reviewCount: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: Spacing.sm,
  },
  description: {
    fontSize: 13,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  metricsColumn: {
    flex: 1,
    paddingLeft: Spacing.lg,
  },
  scoreRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 1,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  metricLabel: {
    width: 44,
    fontSize: 11,
    fontWeight: '600',
  },
  trackBg: {
    flex: 1,
    height: 6,
    borderRadius: Radius.pill,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  metricValue: {
    width: 28,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },

  // Busyness
  busynessContainer: {
    marginBottom: Spacing.md,
  },
  busynessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  busynessHeading: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  busynessBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  openStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  busynessTrackWrapper: {
    height: 8,
    borderRadius: Radius.pill,
    overflow: 'visible',
    position: 'relative',
    marginBottom: 5,
  },
  busynessTrack: {
    height: 8,
    borderRadius: Radius.pill,
  },
  busynessIndicator: {
    position: 'absolute',
    top: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    marginLeft: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  busynessLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  busynessEndLabel: {
    fontSize: 9,
  },

  // Navigate button
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingVertical: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  navText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
