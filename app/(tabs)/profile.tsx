/**
 * Profile Screen
 * - Shows username, email, review count
 * - In-app Dark / Light / System appearance toggle
 * - Sign out
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Appearance,
  ColorSchemeName,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Spacing, useColors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../_layout';

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

export default function ProfileScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const C = useColors();
  const insets = useSafeAreaInsets();
  const systemScheme = useColorScheme();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>('system');

  useEffect(() => {
    if (session?.user) {
      fetchUserProfile(session.user.id);
      fetchUserReviews(session.user.id);
    }
  }, [session]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();
      if (data) setProfile(data);
    } catch (e) {
      console.warn('Error fetching profile', e);
    } finally {
      setLoading(false);
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

  if (!session) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  const avgScore = reviews.length
    ? ((reviews.reduce((sum, r) => sum + r.sound_rating + r.light_rating + r.crowd_rating, 0) / reviews.length) / 3).toFixed(1)
    : '—';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Card ── */}
      <View style={[styles.heroCard, { backgroundColor: C.elevated, borderColor: C.border }]}>
        <View style={[styles.avatarRing, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="person" size={36} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          {loading ? (
            <ActivityIndicator color={C.accent} />
          ) : (
            <>
              <Text style={[styles.nameText, { color: C.text }]}>
                {profile?.username ?? 'Sensory Explorer'}
              </Text>
              <Text style={[styles.emailText, { color: C.textMuted }]} numberOfLines={1}>
                {session.user.email}
              </Text>
            </>
          )}
        </View>
        <TouchableOpacity onPress={handleSignOut} hitSlop={12} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#F43F5E" />
        </TouchableOpacity>
      </View>

      {/* ── Stats Row ── */}
      <View style={styles.statsRow}>
        {[
          { num: String(reviews.length), label: 'Reviews' },
          { num: avgScore, label: 'Avg Score' },
          { num: isDark ? '🌙' : '☀️', label: 'Mode' },
        ].map(({ num, label }) => (
          <View key={label} style={[styles.statBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.statNum, { color: C.text, fontVariant: ['tabular-nums'] }]}>{num}</Text>
            <Text style={[styles.statLabel, { color: C.textMuted }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* ── Appearance ── */}
      <Text style={[styles.sectionTitle, { color: C.text }]}>Appearance</Text>
      <View style={[styles.menuGroup, { backgroundColor: C.surface, borderColor: C.border }]}>
        {(['light', 'system', 'dark'] as AppearanceMode[]).map((mode, i, arr) => (
          <React.Fragment key={mode}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setAppearance(mode)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={mode === 'light' ? 'sunny-outline' : mode === 'dark' ? 'moon-outline' : 'phone-portrait-outline'}
                size={22}
                color={appearanceMode === mode ? C.accent : C.textMuted}
              />
              <Text style={[styles.menuText, { color: C.text }]}>
                {mode === 'light' ? 'Light Mode' : mode === 'dark' ? 'Dark Mode' : 'System Default'}
              </Text>
              {appearanceMode === mode && (
                <Ionicons name="checkmark-circle" size={20} color={C.accent} />
              )}
            </TouchableOpacity>
            {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
          </React.Fragment>
        ))}
      </View>

      {/* ── Recent Reviews ── */}
      <Text style={[styles.sectionTitle, { color: C.text }]}>Recent Reviews</Text>
      {reviews.length === 0 && !loading ? (
        <View style={[styles.emptyState, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="map-outline" size={40} color={C.textDim} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>No reviews yet — go rate a place!</Text>
        </View>
      ) : (
        reviews.map((rev) => {
          const avg = ((rev.sound_rating + rev.light_rating + rev.crowd_rating) / 3);
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

      {/* ── Preferences & Support ── */}
      <Text style={[styles.sectionTitle, { color: C.text }]}>Preferences & Support</Text>
      <View style={[styles.menuGroup, { backgroundColor: C.surface, borderColor: C.border }]}>
        {[
          { icon: 'options-outline', label: 'Sensory Preferences' },
          { icon: 'bookmark-outline', label: 'Favorite Places' },
          { icon: 'help-circle-outline', label: 'Help & Feedback' },
        ].map(({ icon, label }, i, arr) => (
          <React.Fragment key={label}>
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <Ionicons name={icon as any} size={22} color={C.textMuted} />
              <Text style={[styles.menuText, { color: C.text }]}>{label}</Text>
              <Ionicons name="chevron-forward" size={18} color={C.textDim} />
            </TouchableOpacity>
            {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
          </React.Fragment>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderCurve: 'continuous' as any,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  } as any,
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: { fontSize: 18, fontWeight: '700' },
  emailText: { fontSize: 13, marginTop: 2 },
  logoutBtn: { padding: 4 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: {
    flex: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous' as any,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, marginTop: Spacing.xs },
  menuGroup: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous' as any,
    borderWidth: 1,
    paddingVertical: 4,
    boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
  } as any,
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14, gap: Spacing.md },
  menuText: { flex: 1, fontSize: 15, fontWeight: '500' },
  divider: { height: 1, marginLeft: 52 },
  emptyState: { borderRadius: Radius.lg, borderWidth: 1, borderStyle: 'dashed', padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  emptyText: { fontSize: 14 },
  reviewCard: { borderRadius: Radius.md, borderCurve: 'continuous' as any, borderWidth: 1, padding: Spacing.md, gap: 6 } as any,
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewName: { flex: 1, fontSize: 15, fontWeight: '600' },
  scorePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  scorePillText: { fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] as any },
  reviewComment: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
});
