/**
 * LocationSheet — Redesigned bottom sheet for place details
 *
 * Shows place photo, sensory gauges, busyness, and action buttons.
 * Slides up from bottom with pan-to-dismiss gesture.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Radius, Shadows, Spacing, useColors } from '../../constants/theme';
import { usePlaceBusyness, type BusynessLevel } from '../../hooks/usePlaceBusyness';
import { usePlacePhoto } from '../../hooks/usePlacePhoto';
import { supabase } from '../../lib/supabase';
import OverallBadge from './OverallBadge';
import SensoryGauge from './SensoryGauge';

// Re-export so existing imports still work
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
  googlePlaceId?: string;
};

interface Props {
  location: DisplayLocation;
  onClose: () => void;
}

const TAB_BAR_H = 64;
const PHOTO_HEIGHT = 160;

const LEVEL_LABELS: Record<BusynessLevel, string> = {
  quiet: 'Quiet',
  moderate: 'Moderate',
  busy: 'Busy',
};

export default function LocationSheet({ location, onClose }: Props) {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 600;
  const sheetHInset = isTablet ? Math.max(0, (width - 480) / 2) : 0;
  const sheetBottom = TAB_BAR_H + insets.bottom;
  const maxSheetHeight = height - insets.top - sheetBottom - 40;

  // ── Live scores from Supabase ───────────────────────────────────────────
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
          return vals.length > 0
            ? Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 10) / 10
            : null;
        };
        setLiveScores({
          avg_sound: avg('sound_rating'),
          avg_light: avg('light_rating'),
          avg_crowd: avg('crowd_rating'),
          review_count: data.length,
        });
      }
    } catch {
      // Fall back to prop data
    }
  }, [placeId]);

  useEffect(() => { fetchLiveScores(); }, [fetchLiveScores]);

  const scores = {
    avg_sound: liveScores?.avg_sound ?? location.avg_sound,
    avg_light: liveScores?.avg_light ?? location.avg_light,
    avg_crowd: liveScores?.avg_crowd ?? location.avg_crowd,
    review_count: liveScores?.review_count ?? location.review_count,
  };

  let overallScore: number | null = null;
  const scoreVals = [scores.avg_sound, scores.avg_light, scores.avg_crowd].filter(
    (v): v is number => v != null,
  );
  if (scoreVals.length > 0) {
    overallScore = scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length;
  }

  // ── Photo + busyness ────────────────────────────────────────────────────
  const { photoUrl, loading: photoLoading } = usePlacePhoto(location.googlePlaceId);
  const busyness = usePlaceBusyness(location.googlePlaceId);

  // ── Pan gesture ─────────────────────────────────────────────────────────
  const sheetY = useSharedValue(0);
  useEffect(() => { sheetY.value = 0; }, [location.id, sheetY]);

  const panGesture = Gesture.Pan()
    .onChange((e) => {
      'worklet';
      if (e.translationY > 0) sheetY.value = e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      if (e.translationY > 100) {
        runOnJS(onClose)();
      } else {
        sheetY.value = withSpring(0, { damping: 28, stiffness: 320 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleNavigate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { latitude: lat, longitude: lng, name } = location;
    const label = encodeURIComponent(name);
    const googleUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const nativeUrl = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    })!;
    Linking.canOpenURL(nativeUrl).then((ok) => Linking.openURL(ok ? nativeUrl : googleUrl));
  };

  const handleRate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    // Navigate to rate tab with place pre-filled
    router.push({
      pathname: '/(tabs)/submit',
      params: {
        prefillPlaceId: location.googlePlaceId ?? location.id,
        prefillName: location.name,
        prefillAddress: location.description ?? '',
        prefillLat: String(location.latitude),
        prefillLng: String(location.longitude),
      },
    });
  };

  // ── Busyness level color ────────────────────────────────────────────────
  const levelColor = busyness.level === 'quiet' ? C.calm
    : busyness.level === 'moderate' ? C.moderate
    : C.intense;

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.duration(280).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutDown.duration(200).easing(Easing.in(Easing.quad))}
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
              {/* ── Drag handle ──────────────────────────────────── */}
              <View style={[styles.handle, { backgroundColor: C.border }]} />

              {/* ── Close button — always accessible, pinned top-right ── */}
              <Pressable
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: C.elevated, borderColor: C.border }]}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={C.textMuted} />
              </Pressable>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                {/* ── Photo ──────────────────────────────────────── */}
                <View style={[styles.photoContainer, { backgroundColor: C.elevated }]}>
                  {photoUrl ? (
                    <Animated.View entering={FadeIn.duration(300)} style={StyleSheet.absoluteFill}>
                      <Image source={{ uri: photoUrl }} style={styles.photo} />
                      <LinearGradient
                        colors={['transparent', C.surface + 'CC', C.surface]}
                        locations={[0.3, 0.75, 1]}
                        style={styles.photoGradient}
                      />
                    </Animated.View>
                  ) : photoLoading ? (
                    <ActivityIndicator size="small" color={C.textDim} />
                  ) : (
                    <Ionicons name="image-outline" size={36} color={C.textDim} />
                  )}
                </View>

                {/* ── Header ─────────────────────────────────────── */}
                <View style={styles.headerSection}>
                  <Text style={[styles.name, { color: C.text }]} numberOfLines={2}>
                    {location.name}
                  </Text>
                  {!!location.description && (
                    <Text style={[styles.address, { color: C.textMuted }]} numberOfLines={1}>
                      {location.description}
                    </Text>
                  )}
                  <OverallBadge score={overallScore} reviewCount={scores.review_count} />
                </View>

                {/* ── Sensory gauges ─────────────────────────────── */}
                <View style={styles.gaugeSection}>
                  <Text style={[styles.sectionLabel, { color: C.textDim }]}>SENSORY LEVELS</Text>
                  <SensoryGauge label="Sound" value={scores.avg_sound} delay={0} />
                  <SensoryGauge label="Light" value={scores.avg_light} delay={100} />
                  <SensoryGauge label="Crowd" value={scores.avg_crowd} delay={200} />
                </View>

                {/* ── Busyness (if available) ─────────────────────── */}
                {location.googlePlaceId != null && !busyness.loading && busyness.score > 0 && (
                  <View style={styles.busynessSection}>
                    <View style={styles.busynessRow}>
                      <Text style={[styles.sectionLabel, { color: C.textDim }]}>POPULARITY</Text>
                      <View style={styles.busynessRight}>
                        {busyness.isOpenNow !== null && (
                          <View style={[
                            styles.openBadge,
                            { backgroundColor: (busyness.isOpenNow ? C.calm : C.intense) + '18' },
                          ]}>
                            <View style={[
                              styles.openDot,
                              { backgroundColor: busyness.isOpenNow ? C.calm : C.intense },
                            ]} />
                            <Text style={[
                              styles.openText,
                              { color: busyness.isOpenNow ? C.calm : C.intense },
                            ]}>
                              {busyness.isOpenNow ? 'Open' : 'Closed'}
                            </Text>
                          </View>
                        )}
                        <View style={[styles.levelPill, { backgroundColor: levelColor + '18' }]}>
                          <Text style={[styles.levelText, { color: levelColor }]}>
                            {LEVEL_LABELS[busyness.level]}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* Bottom spacer so content doesn't hide behind action buttons */}
                <View style={{ height: Spacing.sm }} />
              </ScrollView>

              {/* ── Action buttons — pinned at bottom, outside scroll ── */}
              <View style={[styles.actions, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border }]}>
                <Pressable
                  style={[styles.rateBtn, { backgroundColor: C.elevated, borderColor: C.border }]}
                  onPress={handleRate}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${location.name}`}
                >
                  <Ionicons name="star-outline" size={18} color={C.accent} />
                  <Text style={[styles.rateBtnText, { color: C.accent }]}>Rate</Text>
                </Pressable>

                <Pressable
                  style={[styles.navBtn, {
                    backgroundColor: C.accent,
                    ...Shadows.glow,
                    shadowColor: C.accent,
                  }]}
                  onPress={handleNavigate}
                  accessibilityRole="button"
                  accessibilityLabel={`Navigate to ${location.name}`}
                >
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={styles.navBtnText}>Navigate</Text>
                </Pressable>
              </View>
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </View>
    </Modal>
  );
}

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
    borderWidth: 1,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: Radius.pill,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },

  // Photo
  photoContainer: {
    height: PHOTO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoGradient: {
    ...StyleSheet.absoluteFillObject,
  },

  // Header
  headerSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  address: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.sm + 4, // below the drag handle
    right: Spacing.md,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Section label
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },

  // Gauges
  gaugeSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },

  // Busyness
  busynessSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  busynessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  busynessRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    gap: 4,
  },
  openDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  openText: {
    fontSize: 11,
    fontWeight: '600',
  },
  levelPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  rateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  rateBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  navBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  navBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
