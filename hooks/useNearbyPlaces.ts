/**
 * useNearbyPlaces — Unified map data hook
 *
 * Fetches ALL nearby places from Google Places API and merges
 * with sensory rating data from Supabase. Supports dynamic "fetch around"
 * so panning the map accumulates more places without replacing existing ones.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MapPlace = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  address?: string;
  isRated: boolean;
  supabaseId?: string;
  googlePlaceId?: string;
  avg_sound: number | null;
  avg_light: number | null;
  avg_crowd: number | null;
  review_count: number;
};

type GooglePlace = {
  place_id: string;
  name: string;
  geometry: { location: { lat: number; lng: number } };
  types?: string[];
  vicinity?: string;
};

/** Raw row from place_reviews table */
type PlaceReviewRow = {
  place_id: string;
  place_name: string;
  sound_rating: number | null;
  light_rating: number | null;
  crowd_rating: number | null;
};

/** Aggregated rating data keyed by Google place_id */
type AggregatedRating = {
  place_id: string;
  place_name: string;
  avg_sound: number | null;
  avg_light: number | null;
  avg_crowd: number | null;
  review_count: number;
};

export type UseNearbyPlacesResult = {
  places: MapPlace[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** Fetch places around a new map center and merge into the existing set. */
  fetchAround: (lat: number, lng: number) => void;
  /** Inject a single place into the cache (e.g. from search results). */
  injectPlace: (place: MapPlace) => void;
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useNearbyPlaces(
  userLat: number | null,
  userLng: number | null,
  radiusMeters: number = 5000,
): UseNearbyPlacesResult {
  // Accumulate all places across multiple fetch centers — keyed by place ID
  const placeCache = useRef<Map<string, MapPlace>>(new Map());
  const ratingsCache = useRef<Map<string, AggregatedRating>>(new Map());

  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Core fetch: Google Places around a center + merge with reviews ──────
  const fetchAroundCenter = useCallback(
    async (lat: number, lng: number, isInitial: boolean) => {
      if (isInitial) setLoading(true);
      setError(null);

      try {
        // On initial load fetch reviews; on subsequent pans reuse cache
        if (isInitial || ratingsCache.current.size === 0) {
          const ratings = await fetchAggregatedRatings();
          ratingsCache.current = ratings;
          // console.log(
          //   `[useNearbyPlaces] Reviews: ${ratings.size} rated places from place_reviews`,
          // );
        }

        const googlePlaces = await fetchGooglePlaces(lat, lng, radiusMeters);
        const merged = mergePlaces(googlePlaces, ratingsCache.current);
        const rated = merged.filter((p) => p.isRated);
        // console.log(
        //   `[useNearbyPlaces] Google: ${googlePlaces.length}, merged: ${merged.length}, rated: ${rated.length}`,
        // );

        // Merge into cache — update existing entries too (scores may have changed)
        for (const place of merged) {
          placeCache.current.set(place.id, place);
        }

        setPlaces(Array.from(placeCache.current.values()));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load places';
        console.error('[useNearbyPlaces]', msg);
        setError(msg);
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [radiusMeters],
  );

  // ── Initial load when user location arrives ────────────────────────────────
  useEffect(() => {
    if (userLat == null || userLng == null) return;
    placeCache.current.clear();
    fetchAroundCenter(userLat, userLng, true);
  }, [userLat, userLng, fetchAroundCenter]);

  // ── Public API ────────────────────────────────────────────────────────────
  const refetch = useCallback(() => {
    if (userLat == null || userLng == null) return;
    placeCache.current.clear();
    ratingsCache.current.clear();
    fetchAroundCenter(userLat, userLng, true);
  }, [userLat, userLng, fetchAroundCenter]);

  const fetchAround = useCallback(
    (lat: number, lng: number) => {
      fetchAroundCenter(lat, lng, false);
    },
    [fetchAroundCenter],
  );

  /** Inject a single place into the cache (e.g. from search). */
  const injectPlace = useCallback(
    (place: MapPlace) => {
      placeCache.current.set(place.id, place);
      setPlaces(Array.from(placeCache.current.values()));
    },
    [],
  );

  return { places, loading, error, refetch, fetchAround, injectPlace };
}

// ── Google Places fetch ───────────────────────────────────────────────────────

/** Place types to search — covers the major categories users will encounter. */
const SEARCH_TYPES = [
  'restaurant',
  'cafe',
  'bar',
  'store',
  'shopping_mall',
  'supermarket',
  'gym',
  'park',
  'library',
  'movie_theater',
  'church',
  'school',
  'hospital',
  'pharmacy',
  'bank',
  'gas_station',
  'lodging',
  'museum',
  'night_club',
  'hair_care',
  'laundry',
  'doctor',
  'dentist',
];

/** Fetch a single type with full pagination (up to 3 pages / 60 results). */
async function fetchGooglePlacesForType(
  lat: number,
  lng: number,
  radius: number,
  type: string,
  apiKey: string,
): Promise<GooglePlace[]> {
  const all: GooglePlace[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 3; page++) {
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      radius: String(radius),
      type,
      key: apiKey,
    });
    if (pageToken) params.set('pagetoken', pageToken);

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`,
    );
    if (!res.ok) throw new Error(`Google Places HTTP ${res.status}`);
    const json = await res.json();

    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      // INVALID_REQUEST can happen when a page token expires — not fatal
      if (json.status === 'INVALID_REQUEST' && page > 0) break;
      throw new Error(`Google Places: ${json.status}`);
    }

    all.push(...((json.results ?? []) as GooglePlace[]));
    pageToken = json.next_page_token;
    if (!pageToken) break;

    // Google requires a short delay before the next page token becomes valid
    await new Promise((r) => setTimeout(r, 1800));
  }

  return all;
}

/**
 * Fetch nearby places across many types in parallel, then deduplicate.
 * This replaces the old single-type, single-page fetch and typically
 * returns 200–400+ unique places instead of ~20.
 */
async function fetchGooglePlaces(lat: number, lng: number, radius: number): Promise<GooglePlace[]> {
  const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!API_KEY) return [];

  // Fire all type searches in parallel
  const results = await Promise.allSettled(
    SEARCH_TYPES.map((type) => fetchGooglePlacesForType(lat, lng, radius, type, API_KEY)),
  );

  // Flatten and deduplicate by place_id
  const seen = new Set<string>();
  const unique: GooglePlace[] = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const place of r.value) {
      if (!seen.has(place.place_id)) {
        seen.add(place.place_id);
        unique.push(place);
      }
    }
  }

  return unique;
}

// ── Supabase fetch — read directly from place_reviews ─────────────────────────
async function fetchAggregatedRatings(): Promise<Map<string, AggregatedRating>> {
  const { data, error } = await supabase
    .from('place_reviews')
    .select('place_id, place_name, sound_rating, light_rating, crowd_rating');
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as PlaceReviewRow[];

  // Group by place_id and compute averages
  const groups = new Map<string, PlaceReviewRow[]>();
  for (const row of rows) {
    const existing = groups.get(row.place_id) ?? [];
    existing.push(row);
    groups.set(row.place_id, existing);
  }

  const result = new Map<string, AggregatedRating>();
  for (const [placeId, reviews] of groups) {
    const avg = (key: 'sound_rating' | 'light_rating' | 'crowd_rating') => {
      const vals = reviews.map((r) => r[key]).filter((v): v is number => v != null);
      return vals.length > 0
        ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
        : null;
    };
    result.set(placeId, {
      place_id: placeId,
      place_name: reviews[0].place_name,
      avg_sound: avg('sound_rating'),
      avg_light: avg('light_rating'),
      avg_crowd: avg('crowd_rating'),
      review_count: reviews.length,
    });
  }

  return result;
}

// ── Merge strategy ────────────────────────────────────────────────────────────
// Match Google Places with aggregated place_reviews by place_id (direct match).
// No proximity matching needed — place_reviews stores the Google place_id directly.
function mergePlaces(googlePlaces: GooglePlace[], ratings: Map<string, AggregatedRating>): MapPlace[] {
  const result: MapPlace[] = [];

  for (const gp of googlePlaces) {
    const rating = ratings.get(gp.place_id);
    if (rating) {
      result.push({
        id: gp.place_id, name: gp.name,
        latitude: gp.geometry.location.lat, longitude: gp.geometry.location.lng,
        category: primaryCategory(gp.types ?? []), address: gp.vicinity,
        isRated: true, supabaseId: gp.place_id, googlePlaceId: gp.place_id,
        avg_sound: rating.avg_sound, avg_light: rating.avg_light, avg_crowd: rating.avg_crowd,
        review_count: rating.review_count,
      });
    } else {
      result.push({
        id: gp.place_id, name: gp.name,
        latitude: gp.geometry.location.lat, longitude: gp.geometry.location.lng,
        category: primaryCategory(gp.types ?? []), address: gp.vicinity,
        isRated: false, googlePlaceId: gp.place_id,
        avg_sound: null, avg_light: null, avg_crowd: null, review_count: 0,
      });
    }
  }

  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SKIP_TYPES = new Set([
  'point_of_interest', 'establishment', 'premise',
  'political', 'sublocality', 'sublocality_level_1',
]);

function primaryCategory(types: string[]): string {
  for (const t of types) { if (!SKIP_TYPES.has(t)) return t; }
  return types[0] ?? 'point_of_interest';
}
