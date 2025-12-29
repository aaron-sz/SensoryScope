import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { DisplayLocation } from './LocationModal';

type Props = {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  locations: DisplayLocation[];
  onSelectLocation: (loc: DisplayLocation) => void;
  getPinColor: (sound: number) => string;
};

export default function SensoryMap({ region, locations, onSelectLocation, getPinColor }: Props) {
  return (
    <MapView
      style={styles.map}
      initialRegion={region}
      showsUserLocation
      provider={PROVIDER_GOOGLE}
    >
      {locations.map((loc) => (
        <Marker
          key={loc.id}
          coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
          title={loc.name}
          pinColor={getPinColor(loc.avg_sound)}
          onPress={() => onSelectLocation(loc)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: '100%' },
});
