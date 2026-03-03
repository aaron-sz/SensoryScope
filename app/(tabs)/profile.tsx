/**
 * Profile Screen
 * - Guest users: see a beautiful "Join SensoryScope" promo card
 * - Signed-in users: avatar, stats, contribution badges, saved places,
 *   sensory sensitivity settings, appearance toggle, review history, sign out
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Spacing, useColors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../_layout';

/* ────────────────── Types ────────────────── */

type UserProfile = {
  username: string;
  avatar_url?: string;
};

type Review = {
  id: string;
  location_id: string;
  sound_rating: number;
  light_rating: number;
  crowd_rating: number;
  comment: string;
  location?: { name: string };
};

type AppearanceMode = 'system' | 'light' | 'dark';
type SensitivityLevel = 'low' | 'med' | 'high';

type SensoryPrefs = {
  noise: SensitivityLevel;
  light: SensitivityLevel;
  crowds: SensitivityLevel;
};

/* ────────────────── Badge Config ────────────────── */

const BADGE_CONFIG = [
  { id: 'first_review', icon: '🌟', label: 'First Review', desc: 'Submit your first rating', threshold: 1 },
  { id: 'explorer', icon: '🗺️', label: 'Explorer', desc: 'Rate 5 different places', threshold: 5 },
  { id: 'cartographer', icon: '📍', label: 'Cartographer', desc: 'Rate 25 different places', threshold: 25 },
  { id: 'scout', icon: '🔭', label: 'Scout', desc: 'Rate 10 different places', threshold: 10 },
];

/* ────────────────── Guest Promo Card ────────────────── */

function GuestPromoCard() {
  const C = useColors();
  const router = useRouter();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: Spacing.lg, paddingTop: 0, gap: Spacing.lg }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={[guestStyles.hero, { backgroundColor: C.elevated, borderColor: C.border }]}>
        <Text style={guestStyles.heroEmoji}>🧭</Text>
        <Text style={[guestStyles.heroTitle, { color: C.text }]}>Join SensoryScope</Text>
        <Text style={[guestStyles.heroSub, { color: C.textMuted }]}>
          Create a free account to unlock personalized features, track your reviews, and help build a more sensory-friendly world.
        </Text>
        <TouchableOpacity
          style={[guestStyles.signupBtn, { backgroundColor: C.accent }]}
          onPress={() => router.push('/signup' as any)}
        >
          <Text style={[guestStyles.signupBtnText, { color: C.bg }]}>Create Free Account</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/login' as any)}>
          <Text style={[guestStyles.loginLink, { color: C.accent }]}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>

      {/* Perks */}
      <Text style={[guestStyles.sectionTitle, { color: C.text }]}>What you unlock</Text>
      {[
        { icon: '⭐', label: 'Submit Ratings', desc: 'Rate noise, light, and crowd levels at any place' },
        { icon: '🔖', label: 'Save Favorites', desc: 'Bookmark sensory-friendly spots you love' },
        { icon: '🎚️', label: 'My Sensory Profile', desc: 'Set your personal sensitivities so the map highlights the right places for you' },
        { icon: '🎖️', label: 'Earn Badges', desc: 'Get rewarded for helping the community' },
      ].map(({ icon, label, desc }) => (
        <View key={label} style={[guestStyles.perkRow, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={guestStyles.perkIcon}>{icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[guestStyles.perkLabel, { color: C.text }]}>{label}</Text>
            <Text style={[guestStyles.perkDesc, { color: C.textMuted }]}>{desc}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const guestStyles = StyleSheet.create({
  hero: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  heroEmoji: { fontSize: 48 },
  heroTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  heroSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  signupBtn: {
    borderRadius: 99,
    paddingHorizontal: Spacing.xl + 8,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  signupBtnText: { fontSize: 16, fontWeight: '700' },
  loginLink: { fontSize: 14, fontWeight: '500', marginTop: -4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  perkIcon: { fontSize: 26 },
  perkLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  perkDesc: { fontSize: 13, lineHeight: 18 },
});

/* ────────────────── Sensitivity Selector ────────────────── */

function SensitivityPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SensitivityLevel;
  onChange: (v: SensitivityLevel) => void;
}) {
  const C = useColors();
  const levels: SensitivityLevel[] = ['low', 'med', 'high'];
  const colors: Record<SensitivityLevel, string> = { low: '#10B981', med: '#F59E0B', high: '#F43F5E' };
  return (
    <View style={sensStyles.row}>
      <Text style={[sensStyles.label, { color: C.text }]}>{label}</Text>
      <View style={sensStyles.pills}>
        {levels.map((lvl) => {
          const active = value === lvl;
          return (
            <TouchableOpacity
              key={lvl}
              style={[sensStyles.pill, { borderColor: colors[lvl], backgroundColor: active ? colors[lvl] + '33' : 'transparent' }]}
              onPress={() => onChange(lvl)}
            >
              <Text style={[sensStyles.pillText, { color: active ? colors[lvl] : C.textMuted, fontWeight: active ? '700' : '500' }]}>
                {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const sensStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12 },
  label: { flex: 1, fontSize: 15, fontWeight: '500' },
  pills: { flexDirection: 'row', gap: 6 },
  pill: { borderWidth: 1.5, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12 },
});

/* ────────────────── Main Profile Screen ────────────────── */

export default function ProfileScreen() {
  const { session, isGuest } = useAuth();
  const router = useRouter();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const systemScheme = useColorScheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>('system');
  const [prefs, setPrefs] = useState<SensoryPrefs>({ noise: 'med', light: 'med', crowds: 'med' });

  useEffect(() => {
    if (session?.user) {
      fetchUserProfile(session.user.id);
      fetchUserReviews(session.user.id);
    }
  }, [session]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();
      if (data) setProfile(data);
    } catch (e) {
      console.warn('Error fetching profile', e);
    }
  };

  const fetchUserReviews = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('reviews')
        .select('*, location:locations(name)')
        .eq('user_id', userId)
        .limit(5);
      if (data) setReviews(data);
    } catch (e) {
      console.warn('Could not fetch reviews', e);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error signing out', error.message);
    } else {
      router.replace('/login' as any);
    }
  };

  const setAppearance = (mode: AppearanceMode) => {
    setAppearanceMode(mode);
    const scheme: ColorSchemeName = mode === 'system' ? null : mode;
    Appearance.setColorScheme(scheme);
  };

  const isDark = appearanceMode === 'dark' || (appearanceMode === 'system' && systemScheme === 'dark');

  // ── Guest State ──
  if (isGuest) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }}>
        <Text style={[styles.pageTitle, { color: C.text, paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg }]}>Profile</Text>
        <GuestPromoCard />
      </View>
    );
  }

  // ── Earned badges based on review count ──
  const earnedBadges = BADGE_CONFIG.filter((b) => reviews.length >= b.threshold);
  const lockedBadges = BADGE_CONFIG.filter((b) => reviews.length < b.threshold);

  const avgScore = reviews.length
    ? ((reviews.reduce((sum, r) => sum + r.sound_rating + r.light_rating + r.crowd_rating, 0) / reviews.length) / 3).toFixed(1)
    : '—';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Card ── */}
      <View style={[styles.heroCard, { backgroundColor: C.elevated, borderColor: C.border }]}>
        <View style={[styles.avatarRing, { backgroundColor: C.surface, borderColor: C.accent + '60' }]}>
          <Text style={{ fontSize: 28 }}>🧭</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.nameText, { color: C.text }]}>
            {profile?.username ?? 'Sensory Explorer'}
          </Text>
          <Text style={[styles.emailText, { color: C.textMuted }]} numberOfLines={1}>
            {session?.user.email}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} hitSlop={12}>
          <Ionicons name="log-out-outline" size={22} color="#F43F5E" />
        </TouchableOpacity>
      </View>

      {/* ── Stats Row ── */}
      <View style={styles.statsRow}>
        {[
          { num: String(reviews.length), label: 'Reviews' },
          { num: avgScore, label: 'Avg Score' },
          { num: String(earnedBadges.length), label: 'Badges' },
          { num: isDark ? '🌙' : '☀️', label: 'Mode' },
        ].map(({ num, label }) => (
          <View key={label} style={[styles.statBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.statNum, { color: C.text }]}>{num}</Text>
            <Text style={[styles.statLabel, { color: C.textMuted }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── Badges ── */}
      <Text style={[styles.sectionTitle, { color: C.text }]}>Badges</Text>
      <View style={[styles.menuGroup, { backgroundColor: C.surface, borderColor: C.border }]}>
        {earnedBadges.length === 0 && (
          <View style={{ padding: Spacing.md, alignItems: 'center' }}>
            <Text style={{ color: C.textMuted, fontSize: 13 }}>No badges yet — submit your first review to start!</Text>
          </View>
        )}
        {[...earnedBadges, ...lockedBadges].map((badge, i, arr) => {
          const earned = earnedBadges.includes(badge);
          return (
            <React.Fragment key={badge.id}>
              <View style={[styles.menuItem, { opacity: earned ? 1 : 0.45 }]}>
                <Text style={{ fontSize: 22 }}>{badge.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuText, { color: C.text }]}>{badge.label}</Text>
                  <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 1 }}>{badge.desc}</Text>
                </View>
                {earned
                  ? <Ionicons name="checkmark-circle" size={20} color={C.accent} />
                  : <Ionicons name="lock-closed-outline" size={18} color={C.textDim} />
                }
              </View>
              {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
            </React.Fragment>
          );
        })}
      </View>

      {/* ── My Sensory Profile ── */}
      <Text style={[styles.sectionTitle, { color: C.text }]}>My Sensory Profile</Text>
      <Text style={{ color: C.textMuted, fontSize: 13, marginTop: -Spacing.xs, marginBottom: Spacing.sm }}>
        Set your sensitivity levels so the app highlights the right places for you.
      </Text>
      <View style={[styles.menuGroup, { backgroundColor: C.surface, borderColor: C.border }]}>
        <SensitivityPicker label="🔊 Noise" value={prefs.noise} onChange={(v) => setPrefs((p) => ({ ...p, noise: v }))} />
        <View style={[styles.divider, { backgroundColor: C.border }]} />
        <SensitivityPicker label="💡 Light" value={prefs.light} onChange={(v) => setPrefs((p) => ({ ...p, light: v }))} />
        <View style={[styles.divider, { backgroundColor: C.border }]} />
        <SensitivityPicker label="👥 Crowds" value={prefs.crowds} onChange={(v) => setPrefs((p) => ({ ...p, crowds: v }))} />
      </View>

      {/* ── Appearance ── */}
      <Text style={[styles.sectionTitle, { color: C.text }]}>Appearance</Text>
      <View style={[styles.menuGroup, { backgroundColor: C.surface, borderColor: C.border }]}>
        {(['light', 'system', 'dark'] as AppearanceMode[]).map((mode, i, arr) => (
          <React.Fragment key={mode}>
            <TouchableOpacity style={styles.menuItem} onPress={() => setAppearance(mode)} activeOpacity={0.7}>
              <Ionicons
                name={mode === 'light' ? 'sunny-outline' : mode === 'dark' ? 'moon-outline' : 'phone-portrait-outline'}
                size={22}
                color={appearanceMode === mode ? C.accent : C.textMuted}
              />
              <Text style={[styles.menuText, { color: C.text }]}>
                {mode === 'light' ? 'Light Mode' : mode === 'dark' ? 'Dark Mode' : 'System Default'}
              </Text>
              {appearanceMode === mode && <Ionicons name="checkmark-circle" size={20} color={C.accent} />}
            </TouchableOpacity>
            {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
          </React.Fragment>
        ))}
      </View>

      {/* ── Recent Reviews ── */}
      <Text style={[styles.sectionTitle, { color: C.text }]}>Recent Reviews</Text>
      {reviews.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={{ fontSize: 36 }}>🗺️</Text>
          <Text style={[styles.emptyText, { color: C.textMuted }]}>No reviews yet — go rate a place!</Text>
        </View>
      ) : (
        reviews.map((rev) => {
          const avg = (rev.sound_rating + rev.light_rating + rev.crowd_rating) / 3;
          const scoreColor = avg <= 3 ? '#10B981' : avg <= 6 ? '#F59E0B' : '#F43F5E';
          return (
            <View key={rev.id} style={[styles.reviewCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.reviewHeader}>
                <Text style={[styles.reviewName, { color: C.text }]} numberOfLines={1}>
                  {rev.location?.name ?? 'Unknown Location'}
                </Text>
                <View style={[styles.scorePill, { backgroundColor: scoreColor + '22' }]}>
                  <Text style={[styles.scorePillText, { color: scoreColor }]}>{avg.toFixed(1)}</Text>
                </View>
              </View>
              {!!rev.comment && (
                <Text style={[styles.reviewComment, { color: C.textMuted }]}>"{rev.comment}"</Text>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: { fontSize: 18, fontWeight: '700' },
  emailText: { fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, marginTop: Spacing.xs },
  menuGroup: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: 4,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14, gap: Spacing.md },
  menuText: { flex: 1, fontSize: 15, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  emptyState: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: { fontSize: 14 },
  reviewCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 6,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewName: { flex: 1, fontSize: 15, fontWeight: '600' },
  scorePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  scorePillText: { fontSize: 12, fontWeight: '800' },
  reviewComment: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
});
