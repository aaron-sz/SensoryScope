/**
 * usePlacePhoto — Fetches a photo URL for a Google Place
 *
 * Uses the Places Details API to get a photo_reference, then builds
 * the photo URL. Returns null while loading or if no photo is available.
 */
import { useEffect, useState } from 'react';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export function buildPhotoUrl(ref: string, maxWidth = 600): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${ref}&key=${API_KEY}`;
}

export function usePlacePhoto(googlePlaceId: string | undefined) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!googlePlaceId || !API_KEY) {
      setPhotoUrl(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${googlePlaceId}&fields=photos&key=${API_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        const ref = json.result?.photos?.[0]?.photo_reference;
        if (!cancelled && ref) {
          setPhotoUrl(buildPhotoUrl(ref));
        }
      } catch {
        // No photo available
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [googlePlaceId]);

  return { photoUrl, loading };
}
