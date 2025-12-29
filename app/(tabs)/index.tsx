import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import LocationModal, { DisplayLocation } from '../../components/LocationModal';
import SensoryMap from '../../components/SensoryMap';
import { supabase } from '../../lib/supabase';

export default function MapScreen() {
  const [locations, setLocations] = useState<DisplayLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<DisplayLocation | null>(null);
  const [region, setRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Default to somewhere if permission denied (e.g., NY)
        setRegion({
            latitude: 40.7128,
            longitude: -74.0060,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
        });
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();

    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    // We expect Supabase to return 'coords' as GeoJSON object automatically for geography columns
    const { data, error } = await supabase.from('locations').select('*');
    
    if (error) {
        console.error('Error fetching locations:', error);
        return;
    }

    if (data) {
        // Parse data and extract lat/long
        const mapped = data.map((loc: any) => {
            let lat = 0;
            let lon = 0;
            
            // Handle GeoJSON structure: { type: 'Point', coordinates: [lon, lat] }
            if (loc.coords && loc.coords.coordinates) {
                 lon = loc.coords.coordinates[0];
                 lat = loc.coords.coordinates[1];
            } else if (typeof loc.coords === 'string') {
                 // Fallback if it comes as string (shouldn't with standard supabase-js)
            }

            return {
                ...loc,
                latitude: lat,
                longitude: lon,
            };
        });
        setLocations(mapped);
    }
  };

  const getPinColor = (sound: number) => {
    if (sound < 3) return 'green';
    if (sound > 7) return 'red';
    return 'yellow'; 
  };

  if (!region) {
      return (
          <View style={[styles.container, styles.loading]}>
              <ActivityIndicator size="large" color="#2f95dc" />
          </View>
      );
  }

  return (
    <View style={styles.container}>
      <SensoryMap
        region={region}
        locations={locations}
        onSelectLocation={setSelectedLocation}
        getPinColor={getPinColor}
      />

      <LocationModal
        visible={!!selectedLocation}
        location={selectedLocation}
        onClose={() => setSelectedLocation(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { justifyContent: 'center', alignItems: 'center' }
});
