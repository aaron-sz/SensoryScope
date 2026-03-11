/**
 * useNearbyPlaces — Unified map data hook
 *
 * Fetches ALL nearby places from Google Places API and merges
 * with sensory rating data from Supabase. Returns a unified list
 * where rated places show score colors and unrated show neutral markers.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export type MapPlace = {
  /** Stable unique key — Google Place ID or Supabase ID */
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Google Places type (restaurant, cafe, park, …) */
  category: string;
  /** Address snippet from Google */
  address?: string;
  /** true = has sensory scores in Supabase */
  isRated: boolean;
  /** Supabase row ID if matched */
  supabaseId?: string;
  /** Google Places place_id — used for busyness / detail fetches */
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

type SupabaseLocation = {
  id: string;
  name: string;
  avg_sound: number | null;
  avg_light: number | null;
  avg_crowd: number | null;
  review_count: number | null;
  coords: { type: 'Point'; coordinates: [number, number] } | null;
};

export type UseNearbyPlacesResult = {
  places: MapPlace[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

// ── Haversine distance (meters) ───────────────────────────────────────────────
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useNearbyPlaces(
  userLat: number | null,
  userLng: number | null,
  radiusMeters: number = 5000,
): UseNearbyPlacesResult {
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaces = useCallback(async () => {
    if (userLat == null || userLng == null) return;

    setLoading(true);
    setError(null);

    try {
      const [googleResult, supabaseResult] = await Promise.allSettled([
        fetchGooglePlaces(userLat, userLng, radiusMeters),
        fetchSupabaseLocations(),
      ]);

      const googlePlaces: GooglePlace[] =
        googleResult.status === 'fulfilled' ? googleResult.value : [];
      const supabaseLocs: SupabaseLocation[] =
        supabaseResult.status === 'fulfilled' ? supabaseResult.value : [];

      const merged = mergePlaces(googlePlaces, supabaseLocs);
      setPlaces(merged);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load places';
      console.error('[useNearbyPlaces]', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userLat, userLng, radiusMeters]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  return { places, loading, error, refetch: fetchPlaces };
}

// ── Google Places fetch ───────────────────────────────────────────────────────
async function fetchGooglePlaces(
  lat: number,
  lng: number,
  radius: number,
): Promise<GooglePlace[]> {
  const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!API_KEY) return [];

  // Broad "point_of_interest" fetch gets restaurants, cafes, parks, etc.
  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${lat},${lng}&radius=${radius}&type=point_of_interest&key=${API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Places HTTP ${res.status}`);
  const json = await res.json();

  if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places: ${json.status}`);
  }

  return (json.results ?? []) as GooglePlace[];
}

// ── Supabase fetch ────────────────────────────────────────────────────────────
async function fetchSupabaseLocations(): Promise<SupabaseLocation[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, avg_sound, avg_light, avg_crowd, review_count, coords');

  if (error) throw new Error(error.message);
  return (data ?? []) as SupabaseLocation[];
}

// ── Merge strategy ─────────────────────────────────────────────────────────────
// For each Supabase location, match to nearest Google Place within 150m.
// Remaining Supabase locations become standalone rated markers.
// Google Places without a match become unrated markers.
function mergePlaces(
  googlePlaces: GooglePlace[],
  supabaseLocs: SupabaseLocation[],
): MapPlace[] {
  const MATCH_RADIUS_M = 150;
  const used = new Set<string>(); // Google place_ids already matched

  // Valid Supabase locations with coordinates
  const validSupabase = supabaseLocs.filter(
    (loc) =>
      loc.coords != null &&
      Array.isArray(loc.coords.coordinates) &&
      loc.coords.coordinates.length >= 2,
  );

  const result: MapPlace[] = [];

  // 1. For each Supabase location, try to find a matching Google Place
  for (const loc of validSupabase) {
    const sLat = loc.coords!.coordinates[1];
    const sLng = loc.coords!.coordinates[0];

    let bestMatch: GooglePlace | null = null;
    let bestDist = MATCH_RADIUS_M;

    for (const gp of googlePlaces) {
      if (used.has(gp.place_id)) continue;
      const d = distanceMeters(sLat, sLng, gp.geometry.location.lat, gp.geometry.location.lng);
      if (d < bestDist) {
        bestDist = d;
        bestMatch = gp;
      }
    }

    if (bestMatch) {
      used.add(bestMatch.place_id);
      result.push({
        id: bestMatch.place_id,
        name: bestMatch.name,
        latitude: bestMatch.geometry.location.lat,
        longitude: bestMatch.geometry.location.lng,
        category: primaryCategory(bestMatch.types ?? []),
        address: bestMatch.vicinity,
        isRated: true,
        supabaseId: loc.id,
        googlePlaceId: bestMatch.place_id,
        avg_sound: loc.avg_sound,
        avg_light: loc.avg_light,
        avg_crowd: loc.avg_crowd,
        review_count: loc.review_count ?? 0,
      });
    } else {
      // Supabase location with no nearby Google match — show as standalone rated marker
      result.push({
        id: loc.id,
        name: loc.name,
        latitude: sLat,
        longitude: sLng,
        category: 'point_of_interest',
        isRated: true,
        supabaseId: loc.id,
        googlePlaceId: undefined,
        avg_sound: loc.avg_sound,
        avg_light: loc.avg_light,
        avg_crowd: loc.avg_crowd,
        review_count: loc.review_count ?? 0,
      });
    }
  }

  // 2. Add unmatched Google Places as unrated markers
  for (const gp of googlePlaces) {
    if (used.has(gp.place_id)) continue;
    result.push({
      id: gp.place_id,
      name: gp.name,
      latitude: gp.geometry.location.lat,
      longitude: gp.geometry.location.lng,
      category: primaryCategory(gp.types ?? []),
      address: gp.vicinity,
      isRated: false,
      googlePlaceId: gp.place_id,
      avg_sound: null,
      avg_light: null,
      avg_crowd: null,
      review_count: 0,
    });
  }

  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SKIP_TYPES = new Set([
  'point_of_interest',
  'establishment',
  'premise',
  'political',
  'sublocality',
  'sublocality_level_1',
]);

function primaryCategory(types: string[]): string {
  for (const t of types) {
    if (!SKIP_TYPES.has(t)) return t;
  }
  return types[0] ?? 'point_of_interest';
}
