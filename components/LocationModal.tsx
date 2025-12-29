import { Button, Icon, Overlay } from '@rneui/themed';
import React from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type DisplayLocation = {
  id: number;
  name: string;
  description: string;
  avg_sound: number;
  avg_light: number;
  avg_crowd: number;
  review_count: number;
  latitude: number;
  longitude: number;
};

type LocationModalProps = {
  visible: boolean;
  location: DisplayLocation | null;
  onClose: () => void;
};

export default function LocationModal({ visible, location, onClose }: LocationModalProps) {
  if (!location) return null;

  const safetyScore = (
    (location.avg_sound + location.avg_light + location.avg_crowd) / 3
  ).toFixed(1);

  const handleNavigate = () => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${location.latitude},${location.longitude}`;
    const label = location.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;

    Linking.canOpenURL(url!).then(supported => {
        if (supported) {
            Linking.openURL(url!);
        } else {
            Linking.openURL(googleMapsUrl);
        }
    });
  };

  const getColor = (val: number) => {
    if (val < 3) return '#4caf50'; // Green
    if (val > 7) return '#f44336'; // Red
    return '#ff9800'; // Orange
  }

  return (
    <Overlay isVisible={visible} onBackdropPress={onClose} overlayStyle={styles.overlay}>
      <View style={styles.header}>
        <Text style={styles.title}>{location.name}</Text>
        <TouchableOpacity onPress={onClose}>
          <Icon name="close" type="ionicon" size={24} />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>{location.description || 'No description available.'}</Text>

      <View style={styles.metricsContainer}>
        <MetricRow label="Quietness" value={location.avg_sound} color={getColor(location.avg_sound)} />
        <MetricRow label="Lighting" value={location.avg_light} color={getColor(location.avg_light)} />
        <MetricRow label="Crowd" value={location.avg_crowd} color={getColor(location.avg_crowd)} />
      </View>

      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Sensory Score</Text>
        <Text style={styles.scoreValue}>{safetyScore}</Text>
      </View>

      <Button
        title="Navigate"
        onPress={handleNavigate}
        icon={{ name: 'navigate', type: 'ionicon', color: 'white' }}
        buttonStyle={styles.navigateButton}
      />
    </Overlay>
  );
}

const MetricRow = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={styles.metricRow}>
    <Text style={styles.metricLabel}>{label}</Text>
    <View style={styles.barContainer}>
       <View style={[styles.barFill, { width: `${(value / 10) * 100}%`, backgroundColor: color }]} />
    </View>
    <Text style={styles.metricValue}>{value.toFixed(1)}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: { width: '90%', padding: 20, borderRadius: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: 'bold' },
  description: { fontSize: 14, color: '#666', marginBottom: 20 },
  metricsContainer: { marginBottom: 20 },
  metricRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  metricLabel: { width: 80, fontSize: 14, fontWeight: '500' },
  barContainer: { flex: 1, height: 10, backgroundColor: '#f0f0f0', marginHorizontal: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  metricValue: { width: 30, textAlign: 'right', fontSize: 14, fontWeight: 'bold' },
  scoreContainer: { alignItems: 'center', marginBottom: 20 },
  scoreLabel: { fontSize: 16, fontWeight: '600', color: '#888' },
  scoreValue: { fontSize: 48, fontWeight: 'bold', color: '#2f95dc' },
  navigateButton: { backgroundColor: '#2f95dc', borderRadius: 10, paddingVertical: 12 },
});
