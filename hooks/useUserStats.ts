/**
 * useUserStats
 * Fetches all data needed for the profile screen and badge system.
 * Queries the `place_reviews` table (the correct table — submit.tsx writes here).
 */
import { useCallback, useEffect, useState } from 'react';
import { BadgeDef, BADGE_DEFS, earnedByCount } from '../constants/badges';
import { supabase } from '../lib/supabase';

export type PlaceReview = {
  id: string;
  place_id: string;
  place_name: string;
  sound_rating: number;
  light_rating: number;
  crowd_rating: number;
  comment: string;
  created_at: string;
};

export type UserStats = {
  reviewCount: number;
  earnedBadgeIds: Set<string>;
  earnedBadges: BadgeDef[];
  lockedBadges: BadgeDef[];
  recentReviews: PlaceReview[];
  isLoading: boolean;
  refresh: () => Promise<void>;
};

export function useUserStats(userId: string | undefined): UserStats {
  const [reviewCount, setReviewCount] = useState(0);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<string>>(new Set());
  const [recentReviews, setRecentReviews] = useState<PlaceReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      // 1. Total review count
      const { count } = await supabase
        .from('place_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      const total = count ?? 0;
      setReviewCount(total);

      // 2. Recent reviews (most recent 10)
      const { data: recent } = await supabase
        .from('place_reviews')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentReviews((recent ?? []) as PlaceReview[]);

      // 3. Compute earned badges
      const earned = earnedByCount(total);

      // Special: quiet_seeker — 5+ reviews with sound_rating <= 3
      const { count: quietCount } = await supabase
        .from('place_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .lte('sound_rating', 3);
      if ((quietCount ?? 0) >= 5) earned.add('quiet_seeker');

      // Special: calm_finder — 3+ reviews where all three ratings are <= 4
      const { count: calmCount } = await supabase
        .from('place_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .lte('sound_rating', 4)
        .lte('light_rating', 4)
        .lte('crowd_rating', 4);
      if ((calmCount ?? 0) >= 3) earned.add('calm_finder');

      // Special: crowd_reporter — 5+ reviews with crowd_rating >= 7
      const { count: crowdCount } = await supabase
        .from('place_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('crowd_rating', 7);
      if ((crowdCount ?? 0) >= 5) earned.add('crowd_reporter');

      setEarnedBadgeIds(earned);
    } catch (e) {
      console.warn('useUserStats error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const earnedBadges = BADGE_DEFS.filter((b) => earnedBadgeIds.has(b.id));
  const lockedBadges = BADGE_DEFS.filter((b) => !earnedBadgeIds.has(b.id));

  return { reviewCount, earnedBadgeIds, earnedBadges, lockedBadges, recentReviews, isLoading, refresh };
}
