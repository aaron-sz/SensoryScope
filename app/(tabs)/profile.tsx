/**
 * Profile Screen
 * Uses useUserStats hook — reads from the correct `place_reviews` table.
 * Shows: hero card, stats row, badges (earned + locked),
 * appearance toggle, and recent reviews.
 */
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
  Alert,
  Appearance,
  ColorSchemeName,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BADGE_DEFS } from '../../constants/badges';
import { Radius, Spacing, useColors } from '../../constants/theme';
import { useUserStats } from '../../hooks/useUserStats';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../_layout';

type AppearanceMode = 'system' | 'light' | 'dark';

// ── Appearance segmented control ─────────────────────────────────────────────
const APPEARANCE_OPTIONS: { mode: AppearanceMode; icon: 'sun' | 'smartphone' | 'moon'; label: string }[] = [
  { mode: 'light', icon: 'sun', label: 'Light' },
  { mode: 'system', icon: 'smartphone', label: 'Auto' },
  { mode: 'dark', icon: 'moon', label: 'Dark' },
];

// ── Guest promo ──────────────────────────────────────────────────────────────
function GuestPromoCard({
  hPad,
  appearanceMode,
  onAppearanceChange,
}: {
  hPad: number;
  appearanceMode: AppearanceMode;
  onAppearanceChange: (mode: AppearanceMode) => void;
}) {
  const C = useColors();
  const router = useRouter();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: hPad, paddingVertical: Spacing.lg, gap: Spacing.md }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[g.hero, { backgroundColor: C.elevated, borderColor: C.border }]}>
        <Text style={g.heroEmoji}>🧭</Text>
        <Text style={[g.heroTitle, { color: C.text }]}>Join SensoryScope</Text>
        <Text style={[g.heroSub, { color: C.textMuted }]}>
          Create a free account to track your reviews, earn badges, and help build a more sensory-friendly world.
        </Text>
        <TouchableOpacity style={[g.btn, { backgroundColor: C.accent }]} onPress={() => router.push('/signup' as any)}>
          <Text style={[g.btnText, { color: C.bg }]}>Create Free Account</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/login' as any)}>
          <Text style={[g.link, { color: C.accent }]}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>

      <Text style={[g.sectionTitle, { color: C.text }]}>What you unlock</Text>
      {[
        { icon: '⭐', label: 'Submit Ratings', desc: 'Rate noise, light, and crowd at any place' },
        { icon: '🎖️', label: 'Earn Badges', desc: 'Get rewarded for helping the community' },
        { icon: '📊', label: 'Review History', desc: 'Track every place you\'ve rated over time' },
        { icon: '🤝', label: 'Community Impact', desc: 'See how your reviews help other visitors' },
      ].map(({ icon, label, desc }) => (
        <View key={label} style={[g.perkRow, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={g.perkIcon}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[g.perkLabel, { color: C.text }]}>{label}</Text>
            <Text style={[g.perkDesc, { color: C.textMuted }]}>{desc}</Text>
          </View>
        </View>
      ))}

      {/* Appearance toggle — available even as guest */}
      <View style={s.appearanceRow}>
        <Text style={[s.sectionTitle, { color: C.text, marginTop: 0 }]}>Appearance</Text>
        <View style={[s.segmented, { backgroundColor: C.surface, borderColor: C.border }]}>
          {APPEARANCE_OPTIONS.map(({ mode, icon, label }) => {
            const active = appearanceMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[s.segmentBtn, active && { backgroundColor: C.elevated }]}
                onPress={() => onAppearanceChange(mode)}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={label}
              >
                <Feather name={icon} size={14} color={active ? C.accent : C.textDim} />
                <Text style={[s.segmentLabel, { color: active ? C.text : C.textMuted, fontWeight: active ? '700' : '500' }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const g = StyleSheet.create({
  hero: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  heroEmoji: { fontSize: 48 },
  heroTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  heroSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn: { borderRadius: 99, paddingHorizontal: Spacing.xl + 8, paddingVertical: Spacing.md, marginTop: Spacing.sm },
  btnText: { fontSize: 16, fontWeight: '700' },
  link: { fontSize: 14, fontWeight: '500' },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  perkIcon: { fontSize: 26 },
  perkLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  perkDesc: { fontSize: 13, lineHeight: 18 },
});

// ── Main Profile ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { session, isGuest } = useAuth();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const systemScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const hPad = width >= 600 ? Math.max(Spacing.lg, (width - 640) / 2) : Spacing.lg;

  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>('light');

  const stats = useUserStats(session?.user.id);

  const isDark = appearanceMode === 'dark' || (appearanceMode === 'system' && systemScheme === 'dark');

  // Derive a display name from user metadata, falling back to the email prefix
  const displayName =
    session?.user.user_metadata?.username ||
    session?.user.user_metadata?.name ||
    session?.user.email?.split('@')[0] ||
    'Explorer';

  // Time-of-day greeting — simple and warm, not gimmicky
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Sign Out Failed', 'Something went wrong. Please try again.');
    } else {
      await SecureStore.deleteItemAsync('sensoryscope_onboarding_v1');
      router.replace('/onboarding' as any);
    }
  };

  const setAppearance = (mode: AppearanceMode) => {
    setAppearanceMode(mode);
    const scheme: ColorSchemeName = mode === 'system' ? null : mode;
    Appearance.setColorScheme(scheme);
  };

  if (isGuest) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 }}>
        <Text style={[s.pageTitle, { color: C.text, paddingHorizontal: hPad, marginBottom: Spacing.lg }]}>Profile</Text>
        <GuestPromoCard hPad={hPad} appearanceMode={appearanceMode} onAppearanceChange={setAppearance} />
      </View>
    );
  }

  // Average score across all recent reviews
  const avgScore = stats.recentReviews.length
    ? (stats.recentReviews.reduce(
        (sum, r) => sum + (r.sound_rating + r.light_rating + r.crowd_rating) / 3, 0
      ) / stats.recentReviews.length).toFixed(1)
    : '—';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100, paddingHorizontal: hPad }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero card ── */}
      <View style={[s.hero, { backgroundColor: C.elevated, borderColor: C.border }]}>
        <View style={[s.avatar, { backgroundColor: C.surface, borderColor: C.accent + '60' }]}>
          <Text style={{ fontSize: 26 }}>🧭</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.heroGreeting, { color: C.textDim }]}>{greeting}</Text>
          <Text style={[s.heroName, { color: C.text }]} numberOfLines={1}>{displayName}</Text>
          <Text style={[s.heroEmail, { color: C.textMuted }]} numberOfLines={1}>{session?.user.email}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} hitSlop={12} accessibilityRole="button" accessibilityLabel="Sign out">
          <Feather name="log-out" size={20} color={C.intense} />
        </TouchableOpacity>
      </View>

      {/* ── Stats row ── */}
      <View style={s.statsRow}>
        {[
          { value: String(stats.reviewCount), label: 'Reviews' },
          { value: avgScore,                  label: 'Avg Score' },
          { value: String(stats.earnedBadges.length), label: 'Badges' },
        ].map(({ value, label }) => (
          <View key={label} style={[s.statBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[s.statVal, { color: C.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            <Text style={[s.statLabel, { color: C.textMuted }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── Badges ── */}
      <Text style={[s.sectionTitle, { color: C.text }]}>Badges</Text>
      <View style={[s.group, { backgroundColor: C.surface, borderColor: C.border }]}>
        {stats.earnedBadges.length === 0 && stats.lockedBadges.length === 0 ? (
          <View style={s.emptyBadge}>
            <Text style={[s.emptyText, { color: C.textMuted }]}>Submit your first vibe check to start earning badges!</Text>
          </View>
        ) : (
          [...stats.earnedBadges, ...stats.lockedBadges].map((badge, i, arr) => {
            const earned = stats.earnedBadgeIds.has(badge.id);
            return (
              <View key={badge.id}>
                <View style={[s.badgeRow, { opacity: earned ? 1 : 0.42 }]}>
                  <Text style={s.badgeEmoji}>{badge.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.badgeName, { color: C.text }]}>{badge.label}</Text>
                    <Text style={[s.badgeDesc, { color: C.textMuted }]}>{badge.desc}</Text>
                  </View>
                  {earned
                    ? <Feather name="check-circle" size={18} color={C.accent} />
                    : <Feather name="lock" size={16} color={C.textDim} />
                  }
                </View>
                {i < arr.length - 1 && <View style={[s.divider, { backgroundColor: C.border }]} />}
              </View>
            );
          })
        )}
      </View>

      {/* ── Appearance ── */}
      <View style={s.appearanceRow}>
        <Text style={[s.sectionTitle, { color: C.text, marginTop: 0 }]}>Appearance</Text>
        <View style={[s.segmented, { backgroundColor: C.surface, borderColor: C.border }]}>
          {APPEARANCE_OPTIONS.map(({ mode, icon, label }) => {
            const active = appearanceMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[s.segmentBtn, active && { backgroundColor: C.elevated }]}
                onPress={() => setAppearance(mode)}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={label}
              >
                <Feather name={icon} size={14} color={active ? C.accent : C.textDim} />
                <Text style={[s.segmentLabel, { color: active ? C.text : C.textMuted, fontWeight: active ? '700' : '500' }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Recent reviews ── */}
      <Text style={[s.sectionTitle, { color: C.text }]}>Recent Reviews</Text>
      {stats.recentReviews.length === 0 ? (
        <View style={[s.emptyState, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={{ fontSize: 36 }}>🗺️</Text>
          <Text style={[s.emptyText, { color: C.textMuted }]}>No reviews yet — go rate a place!</Text>
        </View>
      ) : (
        stats.recentReviews.map((rev) => {
          const avg = (rev.sound_rating + rev.light_rating + rev.crowd_rating) / 3;
          const scoreColor = avg <= 3.5 ? C.calm : avg <= 6.5 ? C.moderate : C.intense;
          return (
            <View key={rev.id} style={[s.reviewCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={s.reviewHeader}>
                <Text style={[s.reviewName, { color: C.text }]} numberOfLines={1}>{rev.place_name}</Text>
                <View style={[s.scorePill, { backgroundColor: scoreColor + '22' }]}>
                  <Text style={[s.scorePillText, { color: scoreColor }]}>{avg.toFixed(1)}</Text>
                </View>
              </View>
              <View style={s.reviewStats}>
                {[
                  { label: '🔊', value: rev.sound_rating },
                  { label: '💡', value: rev.light_rating },
                  { label: '👥', value: rev.crowd_rating },
                ].map(({ label, value }) => (
                  <Text key={label} style={[s.reviewStat, { color: C.textMuted }]}>
                    {label} {value}/10
                  </Text>
                ))}
              </View>
              {!!rev.comment && (
                <Text style={[s.reviewComment, { color: C.textMuted }]}>"{rev.comment}"</Text>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  pageTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  scroll: { gap: Spacing.md },

  hero: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  heroGreeting: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  heroName: { fontSize: 17, fontWeight: '700' },
  heroEmail: { fontSize: 13, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: { flex: 1, borderRadius: Radius.md, borderWidth: 1, paddingVertical: Spacing.md, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, marginTop: Spacing.xs },

  group: { borderRadius: Radius.lg, borderWidth: 1, paddingVertical: 4, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },

  badgeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14, gap: Spacing.md },
  badgeEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  badgeName: { fontSize: 15, fontWeight: '600' },
  badgeDesc: { fontSize: 12, marginTop: 1 },
  emptyBadge: { padding: Spacing.md, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },

  appearanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  segmented: { flexDirection: 'row', borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden', padding: 3, gap: 2 },
  segmentBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm - 2 },
  segmentLabel: { fontSize: 12 },

  emptyState: { borderRadius: Radius.lg, borderWidth: 1, borderStyle: 'dashed', padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },

  reviewCard: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 6 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewName: { flex: 1, fontSize: 15, fontWeight: '600' },
  reviewStats: { flexDirection: 'row', gap: Spacing.md },
  reviewStat: { fontSize: 12 },
  scorePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  scorePillText: { fontSize: 12, fontWeight: '800' },
  reviewComment: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
});
