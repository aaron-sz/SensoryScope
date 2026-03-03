import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/theme';
import { DisplayLocation } from './LocationModal';

type Props = {
  region: any;
  selectedId: string | null;
  onSelectLocation: (loc: DisplayLocation) => void;
  mapType?: 'standard' | 'satellite';
  onRegionChangeComplete?: (region: any) => void;
};

const SensoryMap = forwardRef(function SensoryMap(_props: Props, _ref: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Map is not available on Web</Text>
      <Text style={styles.subtext}>Please run on iOS or Android to see the map.</Text>
    </View>
  );
});

export default SensoryMap;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  text: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  subtext: { fontSize: 14, color: Colors.textMuted, marginTop: 10 },
});
