/**
 * useMapCamera — Encapsulates Mapbox Camera ref + flyTo helpers.
 *
 * Returns the cameraRef to attach to <Camera ref={cameraRef} />,
 * plus flyTo, flyToUser, and flyToDefault helpers.
 */
import type { Camera } from '@rnmapbox/maps';
import { useCallback, useRef } from 'react';

const US_CENTER: [number, number] = [-98.5795, 39.8283];
const DEFAULT_ZOOM = 4;
const USER_ZOOM = 13;
const SELECTED_ZOOM = 15;
const FILTER_ZOOM = 13;

export function useMapCamera() {
  const cameraRef = useRef<Camera>(null);

  const flyTo = useCallback(
    (
      coordinate: [number, number],
      zoom: number = SELECTED_ZOOM,
      duration: number = 800,
      pitch: number = 30,
    ) => {
      cameraRef.current?.setCamera({
        centerCoordinate: coordinate,
        zoomLevel: zoom,
        animationMode: 'flyTo',
        animationDuration: duration,
        pitch,
      });
    },
    [],
  );

  const flyToUser = useCallback(
    (userCoords: [number, number] | null) => {
      if (!userCoords) return;
      cameraRef.current?.setCamera({
        centerCoordinate: userCoords,
        zoomLevel: USER_ZOOM,
        animationMode: 'flyTo',
        animationDuration: 900,
        pitch: 0,
      });
    },
    [],
  );

  const flyToDefault = useCallback(() => {
    cameraRef.current?.setCamera({
      centerCoordinate: US_CENTER,
      zoomLevel: DEFAULT_ZOOM,
      animationMode: 'flyTo',
      animationDuration: 600,
      pitch: 0,
    });
  }, []);

  const resetToUser = useCallback(
    (userCoords: [number, number] | null) => {
      const center = userCoords ?? US_CENTER;
      const zoom = userCoords ? FILTER_ZOOM : DEFAULT_ZOOM;
      cameraRef.current?.setCamera({
        centerCoordinate: center,
        zoomLevel: zoom,
        animationMode: 'flyTo',
        animationDuration: 700,
        pitch: 0,
      });
    },
    [],
  );

  return { cameraRef, flyTo, flyToUser, flyToDefault, resetToUser };
}

export { US_CENTER, DEFAULT_ZOOM, SELECTED_ZOOM };
