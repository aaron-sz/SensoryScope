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
import React, { useEffect } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Radius, scoreColor, Shadows, Spacing } from '../constants/theme';
import { usePlaceBusyness, type BusynessLevel } from '../hooks/usePlaceBusyness';

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
export default function LocationModal({ location, onClose }: Props) {
  let overallScore: number | null = null;
  if (location.avg_sound !== null && location.avg_light !== null && location.avg_crowd !== null) {
    overallScore = (location.avg_sound + location.avg_light + location.avg_crowd) / 3;
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
        sheetY.value = withSpring(0, { damping: 20, stiffness: 260 });
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
    <Animated.View
      entering={SlideInDown.springify().damping(22).stiffness(240)}
      exiting={SlideOutDown.springify().damping(22).stiffness(240)}
      style={styles.sheet}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheetInner, sheetStyle]}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Header row */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.locationName} numberOfLines={1}>
                {location.name}
              </Text>
              <Text style={styles.reviewCount}>
                {location.review_count ?? 0} sensory rating{location.review_count !== 1 ? 's' : ''}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          {/* Description / address */}
          {!!location.description && (
            <Text style={styles.description} numberOfLines={2}>
              {location.description}
            </Text>
          )}

          {/* Score ring + metric bars */}
          <View style={styles.contentRow}>
            <ScoreRing score={overallScore} />
            <View style={styles.metricsColumn}>
              <MetricBar label="Sound" value={location.avg_sound} delay={0} />
              <MetricBar label="Light" value={location.avg_light} delay={80} />
              <MetricBar label="Crowd" value={location.avg_crowd} delay={160} />
            </View>
          </View>

          {/* Busyness bar — only when data is available */}
          {location.googlePlaceId != null && (
            <BusynessBar
              score={busyness.score}
              level={busyness.level}
              isOpenNow={busyness.isOpenNow}
              loading={busyness.loading}
            />
          )}

          {/* Navigate CTA */}
          <Pressable style={styles.navButton} onPress={handleNavigate}>
            <Ionicons name="navigate" size={18} color={Colors.bg} />
            <Text style={styles.navText}>Navigate</Text>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

// ── ScoreRing ─────────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <View
        style={[
          styles.scoreRing,
          { borderColor: Colors.border, backgroundColor: Colors.surface, ...Shadows.subtle },
        ]}
      >
        <Text style={[styles.scoreNumber, { color: Colors.textDim, fontSize: 16 }]}>N/A</Text>
        <Text style={[styles.scoreLabel, { color: Colors.textMuted }]}>No data</Text>
      </View>
    );
  }

  const color = scoreColor(score);
  const label = score <= 3 ? 'Calm' : score <= 6 ? 'Moderate' : 'Intense';

  return (
    <View style={[styles.scoreRing, { borderColor: color, ...Shadows.card, shadowColor: color }]}>
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
  const safeValue = value ?? 0;
  const color = value === null ? Colors.border : scoreColor(safeValue);
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
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.trackBg}>
        <Animated.View style={[styles.trackFill, barStyle, { backgroundColor: color }]} />
      </View>
      <Text style={[styles.metricValue, { color: value === null ? Colors.textDim : color }]}>
        {value === null ? '-' : safeValue.toFixed(1)}
      </Text>
    </View>
  );
}

// ── BusynessBar ───────────────────────────────────────────────────────────────
const BUSYNESS_GRADIENT: [string, string, string] = ['#22C55E', '#EAB308', '#EF4444'];

const LEVEL_LABELS: Record<BusynessLevel, string> = {
  quiet: 'Quiet',
  moderate: 'Moderate',
  busy: 'Busy',
};

const LEVEL_COLORS: Record<BusynessLevel, string> = {
  quiet: '#22C55E',
  moderate: '#EAB308',
  busy: '#EF4444',
};

interface BusynessBarProps {
  score: number;
  level: BusynessLevel;
  isOpenNow: boolean | null;
  loading: boolean;
}

function BusynessBar({ score, level, isOpenNow, loading }: BusynessBarProps) {
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withTiming(score, { duration: 700 });
  }, [score, fillWidth]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const indicatorStyle = useAnimatedStyle(() => ({ left: `${fillWidth.value}%` as any }));

  if (loading) {
    return (
      <View style={styles.busynessRow}>
        <Text style={styles.busynessHeading}>Popularity</Text>
        <ActivityIndicator size="small" color={Colors.textMuted} />
      </View>
    );
  }

  if (score === 0) return null;

  const levelColor = LEVEL_COLORS[level];
  const levelLabel = LEVEL_LABELS[level];

  return (
    <View
      style={styles.busynessContainer}
      accessibilityLabel={`Busyness: ${score}% — ${levelLabel}`}
    >
      <View style={styles.busynessRow}>
        <Text style={styles.busynessHeading}>Popularity</Text>
        <View style={styles.busynessBadgeRow}>
          {isOpenNow !== null && (
            <Text style={[styles.openStatus, { color: isOpenNow ? '#22C55E' : '#EF4444' }]}>
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
          colors={BUSYNESS_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.busynessTrack}
        />
        {/* Indicator dot */}
        <Animated.View style={[styles.busynessIndicator, indicatorStyle]} />
      </View>

      <View style={styles.busynessLabels}>
        <Text style={styles.busynessEndLabel}>Quiet</Text>
        <Text style={styles.busynessEndLabel}>Busy</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 100,
  },
  sheetInner: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
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
    color: Colors.text,
    letterSpacing: 0.2,
  },
  reviewCount: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    color: Colors.textMuted,
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
    backgroundColor: Colors.elevated,
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
    color: Colors.textMuted,
  },
  trackBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.elevated,
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
    color: Colors.textMuted,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1E293B',
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
    color: Colors.textMuted,
  },

  // Navigate button
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingVertical: 14,
  },
  navText: {
    color: Colors.bg,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
