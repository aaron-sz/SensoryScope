/**
 * usePlaceBusyness — Fetches Google Place Details to derive a busyness score.
 *
 * Uses `user_ratings_total` and `rating` from the Places Details API as a
 * proxy for how busy/popular a venue tends to be. More reviews + high rating
 * → higher busyness score.
 *
 * Returns a 0–100 busyness score and supporting metadata.
 */
import { useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BusynessLevel = 'quiet' | 'moderate' | 'busy';

export type PlaceBusynessResult = {
  score: number;           // 0–100
  level: BusynessLevel;
  isOpenNow: boolean | null;
  googleRating: number | null;
  userRatingsTotal: number | null;
  loading: boolean;
  error: string | null;
};

type PlaceDetailsResponse = {
  result?: {
    opening_hours?: { open_now?: boolean };
    rating?: number;
    user_ratings_total?: number;
    business_status?: string;
  };
  status: string;
};

// ── Busyness derivation ───────────────────────────────────────────────────────
function deriveBusynessScore(userRatingsTotal: number, rating: number): number {
  // More reviews + a strong rating = busier/more popular venue.
  // Cap the ratings count influence at 500 reviews.
  const ratingFactor = Math.min(userRatingsTotal / 500, 1);
  // Boost slightly for well-loved places (≥ 4.0)
  const popularityBoost = rating >= 4.0 ? 1.2 : rating >= 3.0 ? 1.0 : 0.8;
  return Math.min(Math.round(ratingFactor * popularityBoost * 100), 100);
}

function levelFromScore(score: number): BusynessLevel {
  if (score >= 65) return 'busy';
  if (score >= 30) return 'moderate';
  return 'quiet';
}

// ── Hook ──────────────────────────────────────────────────────────────────────
const INITIAL: PlaceBusynessResult = {
  score: 0,
  level: 'quiet',
  isOpenNow: null,
  googleRating: null,
  userRatingsTotal: null,
  loading: false,
  error: null,
};

export function usePlaceBusyness(googlePlaceId: string | null | undefined): PlaceBusynessResult {
  const [result, setResult] = useState<PlaceBusynessResult>(INITIAL);

  useEffect(() => {
    if (!googlePlaceId) {
      setResult(INITIAL);
      return;
    }

    let cancelled = false;
    setResult((prev) => ({ ...prev, loading: true, error: null }));

    (async () => {
      try {
        const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!API_KEY) throw new Error('Google Maps API key not configured');

        const fields = 'opening_hours,rating,user_ratings_total,business_status';
        const url =
          `https://maps.googleapis.com/maps/api/place/details/json` +
          `?place_id=${encodeURIComponent(googlePlaceId)}` +
          `&fields=${fields}` +
          `&key=${API_KEY}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`Places Details HTTP ${res.status}`);
        const json: PlaceDetailsResponse = await res.json();

        if (json.status !== 'OK') throw new Error(`Places Details: ${json.status}`);
        if (cancelled) return;

        const detail = json.result ?? {};
        const rating = detail.rating ?? 0;
        const total = detail.user_ratings_total ?? 0;
        const isOpenNow = detail.opening_hours?.open_now ?? null;
        const score = total > 0 ? deriveBusynessScore(total, rating) : 0;

        setResult({
          score,
          level: levelFromScore(score),
          isOpenNow,
          googleRating: detail.rating ?? null,
          userRatingsTotal: total > 0 ? total : null,
          loading: false,
          error: null,
        });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to fetch busyness';
        setResult((prev) => ({ ...prev, loading: false, error: msg }));
      }
    })();

    return () => { cancelled = true; };
  }, [googlePlaceId]);

  return result;
}
