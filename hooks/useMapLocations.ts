/**
 * useMapLocations — Fetches sensory location data from Supabase
 * and maps it to the DisplayLocation shape used by the map and modals.
 */
import { useCallback, useEffect, useState } from 'react';
import { DisplayLocation } from '../components/LocationModal';
import { supabase } from '../lib/supabase';

type GeoJSONPoint = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

type LocationRow = {
  id: string;
  name: string;
  description: string | null;
  avg_sound: number | null;
  avg_light: number | null;
  avg_crowd: number | null;
  review_count: number | null;
  coords: GeoJSONPoint | null;
};

export type UseMapLocationsResult = {
  locations: DisplayLocation[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useMapLocations(): UseMapLocationsResult {
  const [locations, setLocations] = useState<DisplayLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('locations')
        .select('id, name, description, avg_sound, avg_light, avg_crowd, review_count, coords');

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      const rows = (data ?? []) as LocationRow[];

      // PostGIS may return coords as a JSON string — normalize
      const mapped: DisplayLocation[] = [];
      for (const row of rows) {
        if (row.coords == null) continue;
        let c: any;
        try {
          c = typeof row.coords === 'string' ? JSON.parse(row.coords as unknown as string) : row.coords;
        } catch { continue; }
        if (
          !c ||
          !Array.isArray(c.coordinates) ||
          c.coordinates.length < 2 ||
          typeof c.coordinates[0] !== 'number' ||
          typeof c.coordinates[1] !== 'number'
        ) continue;
        mapped.push({
          id: row.id,
          name: row.name,
          description: row.description ?? undefined,
          avg_sound: row.avg_sound,
          avg_light: row.avg_light,
          avg_crowd: row.avg_crowd,
          review_count: row.review_count ?? 0,
          longitude: c.coordinates[0],
          latitude: c.coordinates[1],
        });
      }

      setLocations(mapped);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load locations';
      console.error('[useMapLocations]', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return { locations, loading, error, refetch: fetchLocations };
}
