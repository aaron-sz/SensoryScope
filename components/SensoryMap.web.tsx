import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DisplayLocation } from './LocationModal';

type Props = {
  region: any;
  locations: DisplayLocation[];
  onSelectLocation: (loc: DisplayLocation) => void;
  getPinColor: (sound: number) => string;
};

export default function SensoryMap(props: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Map is not supported on Web.</Text>
      <Text style={styles.subtext}>Please run on iOS or Android.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  text: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  subtext: { fontSize: 14, color: '#666', marginTop: 10 },
});
