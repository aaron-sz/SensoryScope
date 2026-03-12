/**
 * Badge definitions — single source of truth for the badge system.
 * Used by useUserStats (to compute earned), submit screen (to detect unlocks),
 * and profile screen (to display).
 */

export type BadgeDef = {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  /** Count-based: earned when reviewCount >= threshold */
  threshold?: number;
};

export const BADGE_DEFS: BadgeDef[] = [
  {
    id: 'first_step',
    emoji: '🌱',
    label: 'First Step',
    desc: 'Submit your very first vibe check',
    threshold: 1,
  },
  {
    id: 'explorer',
    emoji: '🧭',
    label: 'Explorer',
    desc: 'Rate 5 different places',
    threshold: 5,
  },
  {
    id: 'scout',
    emoji: '🔭',
    label: 'Scout',
    desc: 'Rate 10 different places',
    threshold: 10,
  },
  {
    id: 'cartographer',
    emoji: '📍',
    label: 'Cartographer',
    desc: 'Rate 25 different places',
    threshold: 25,
  },
  {
    id: 'trailblazer',
    emoji: '🏆',
    label: 'Trailblazer',
    desc: 'Rate 50 different places',
    threshold: 50,
  },
  {
    id: 'quiet_seeker',
    emoji: '🤫',
    label: 'Quiet Seeker',
    desc: 'Find 5 places with very low sound levels',
    // Special: computed separately by useUserStats
  },
  {
    id: 'calm_finder',
    emoji: '🌿',
    label: 'Calm Finder',
    desc: 'Report 5 places that are calm across all senses',
    // Special: computed separately by useUserStats
  },
  {
    id: 'crowd_reporter',
    emoji: '📣',
    label: 'Crowd Reporter',
    desc: 'Report 5 busy or crowded places',
    // Special: computed separately by useUserStats
  },
];

/** Given a review count, return all badge IDs earned by count threshold. */
export function earnedByCount(reviewCount: number): Set<string> {
  const earned = new Set<string>();
  for (const b of BADGE_DEFS) {
    if (b.threshold !== undefined && reviewCount >= b.threshold) {
      earned.add(b.id);
    }
  }
  return earned;
}

/**
 * Returns badges that are in newEarned but NOT in prevEarned.
 * Used to detect newly unlocked badges after a submission.
 */
export function getNewlyEarned(prevEarned: Set<string>, newEarned: Set<string>): BadgeDef[] {
  return BADGE_DEFS.filter((b) => !prevEarned.has(b.id) && newEarned.has(b.id));
}
