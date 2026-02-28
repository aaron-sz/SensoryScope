/**
 * Map Screen
 *
 * Full-screen dark map with:
 *  - User location centering with animated FAB
 *  - Live Supabase location pins (glowing, color-coded by sensory score)
 *  - Animated LocationModal bottom sheet on pin tap
 *  - Frosted-glass header overlay with app title + refresh button
 *  - Tap-away backdrop to dismiss the sheet
 */
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView from 'react-native-maps';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import LocationModal, { DisplayLocation } from '../../components/LocationModal';
import PlaceSearchBar from '../../components/PlaceSearchBar';
import SensoryMap from '../../components/SensoryMap.native';
import { Colors, Shadows, Spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const NC_DEFAULT: Region = {
  latitude: 35.7796,
  longitude: -78.6382,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [locations, setLocations]             = useState<DisplayLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<DisplayLocation | null>(null);
  const [region, setRegion]                   = useState<Region | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);

  useEffect(() => {
    initLocation();
    fetchLocations();
  }, []);

  const initLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setRegion(NC_DEFAULT);
        return;
      }
      // getCurrentPositionAsync can throw even after permission is granted
      // (system-level GPS off, airplane mode, emulator with no mock location, etc.)
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setRegion({
        latitude:       loc.coords.latitude,
        longitude:      loc.coords.longitude,
        latitudeDelta:  0.08,
        longitudeDelta: 0.08,
      });
    } catch (e) {
      console.warn('Could not get device location — showing NC default:', e);
      setRegion(NC_DEFAULT);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    setRefreshing(true);
    const { data, error } = await supabase.from('locations').select('*');

    if (error) {
      console.error(
        'Error fetching locations:',
        error.code, '|', error.message, '|', error.details, '|', error.hint
      );
    }

    if (data) {
      const mapped = data.map((loc: any) => {
        let lat = 0, lon = 0;
        if (loc.coords?.coordinates) {
          lon = loc.coords.coordinates[0];
          lat = loc.coords.coordinates[1];
        }
        return { ...loc, latitude: lat, longitude: lon };
      });
      setLocations(mapped);
    }
    setRefreshing(false);
  };

  const handlePlaceSelect = useCallback((loc: DisplayLocation) => {
    setSelectedLocation(loc);
    mapRef.current?.animateToRegion(
      { latitude: loc.latitude, longitude: loc.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      600
    );
  }, []);

  const recenterMap = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion(
        { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        600
      );
    } catch (e) {
      console.warn('Could not re-center — location unavailable:', e);
    }
  };

  if (loading || !region) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Finding your location…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full-screen map */}
      <SensoryMap
        ref={mapRef}
        region={region}
        locations={locations}
        selectedId={selectedLocation?.id ?? null}
        onSelectLocation={setSelectedLocation}
      />

      {/* ── Frosted header ── */}
      <View style={styles.headerOverlay} pointerEvents="box-none">
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.headerTitle}>SensoryScope</Text>
            <Text style={styles.headerSub}>
              {locations.length} place{locations.length !== 1 ? 's' : ''} rated nearby
            </Text>
          </View>
          <Pressable onPress={fetchLocations} style={styles.iconBtn} hitSlop={10}>
            {refreshing
              ? <ActivityIndicator size="small" color={Colors.primaryLight} />
              : <Ionicons name="refresh" size={20} color={Colors.primaryLight} />
            }
          </Pressable>
        </View>

        {/* Search bar sits below the header card, inside the same absolute layer */}
        <PlaceSearchBar locations={locations} onSelect={handlePlaceSelect} />
      </View>

      {/* ── Re-center FAB ── */}
      <Pressable style={styles.fab} onPress={recenterMap}>
        <Ionicons name="locate" size={22} color={Colors.text} />
      </Pressable>

      {/* ── Bottom sheet + backdrop ── */}
      {selectedLocation && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(180)}
          style={StyleSheet.absoluteFill}
          pointerEvents="box-none"
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setSelectedLocation(null)}
          />
          <LocationModal
            location={selectedLocation!}
            onClose={() => setSelectedLocation(null)}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    gap: Spacing.md,
  },
  loadingText: { color: Colors.textMuted, fontSize: 14 },

  headerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingTop: 52,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    zIndex: 10,
    elevation: 10,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerSub: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.elevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },

  fab: {
    position: 'absolute',
    right: Spacing.md,
    bottom: 120,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
    ...Shadows.card,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
  },
});
