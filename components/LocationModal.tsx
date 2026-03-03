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
 *  - Navigate button that opens the device maps app
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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
};

type Props = {
  location: DisplayLocation;
  onClose: () => void;
};

export default function LocationModal({ location, onClose }: Props) {
  let overallScore: number | null = null;
  if (location.avg_sound !== null && location.avg_light !== null && location.avg_crowd !== null) {
    overallScore = (location.avg_sound + location.avg_light + location.avg_crowd) / 3;
  }
  const sheetY = useSharedValue(0);

  // Reset sheet position on each open
  useEffect(() => {
    sheetY.value = 0;
  }, [location.id]);

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

    Linking.canOpenURL(nativeUrl).then((ok) =>
      Linking.openURL(ok ? nativeUrl : googleUrl)
    );
  };

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(22).stiffness(240)}
      exiting={SlideOutDown.springify().damping(22).stiffness(240)}
      style={styles.sheet}
    >
      {/* Drag handle */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheetInner, sheetStyle]}>
          <View style={styles.handle} />

          {/* Header row */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationName} numberOfLines={1}>
                {location.name}
              </Text>
              <Text style={styles.reviewCount}>
                {location.review_count ?? 0} rating{location.review_count !== 1 ? 's' : ''}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          {/* Description */}
          {!!location.description && (
            <Text style={styles.description} numberOfLines={2}>
              {location.description}
            </Text>
          )}

          {/* Score ring + metric bars */}
          <View style={styles.contentRow}>
            {/* Big score circle */}
            <ScoreRing score={overallScore} />

            {/* Individual metric bars */}
            <View style={{ flex: 1, paddingLeft: Spacing.lg }}>
              <MetricBar label="Sound" value={location.avg_sound} delay={0} />
              <MetricBar label="Light" value={location.avg_light} delay={80} />
              <MetricBar label="Crowd" value={location.avg_crowd} delay={160} />
            </View>
          </View>

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

/* ---------- ScoreRing ---------- */
function ScoreRing({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <View style={[styles.scoreRing, { borderColor: Colors.border, backgroundColor: Colors.surface, ...Shadows.subtle }]}>
        <Text style={[styles.scoreNumber, { color: Colors.textDim, fontSize: 16 }]}>N/A</Text>
        <Text style={[styles.scoreLabel, { color: Colors.textMuted }]}>No reviews</Text>
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

/* ---------- MetricBar ---------- */
function MetricBar({ label, value, delay }: { label: string; value: number | null; delay: number }) {
  const safeValue = value ?? 0;
  const color = value === null ? Colors.border : scoreColor(safeValue);
  const fill = useSharedValue(0);

  useEffect(() => {
    if (value !== null) {
      fill.value = withDelay(delay, withTiming((safeValue / 10) * 100, { duration: 600 }));
    }
    return () => { fill.value = 0; };
  }, [value, delay]);

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

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Leave room for the floating tab bar (≈100px)
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
    boxShadow: '0 -8px 40px rgba(0,0,0,0.08)',
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
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingVertical: 14,
    boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
  },
  navText: {
    color: Colors.bg,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
