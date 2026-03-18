/**
 * SensoryGauge — Compact animated bar for a single sensory metric
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Spacing, useColors, useScoreColor } from '../../constants/theme';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Sound: 'volume-medium-outline',
  Light: 'sunny-outline',
  Crowd: 'people-outline',
};

interface Props {
  label: string;
  value: number | null;
  delay?: number;
}

export default function SensoryGauge({ label, value, delay = 0 }: Props) {
  const C = useColors();
  const scoreColor = useScoreColor();

  const safeValue = value ?? 0;
  const color = value === null ? C.border : scoreColor(safeValue);
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = 0;
    if (value !== null) {
      fill.value = withDelay(delay, withTiming((safeValue / 10) * 100, { duration: 700 }));
    }
    return () => { fill.value = 0; };
  }, [value, delay, fill, safeValue]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${fill.value}%` as unknown as number,
  }));

  const icon = ICONS[label] ?? 'ellipse-outline';

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Ionicons name={icon} size={14} color={value === null ? C.textDim : color} />
        <Text style={[styles.label, { color: C.textMuted }]}>{label}</Text>
        <Text style={[styles.value, { color: value === null ? C.textDim : color }]}>
          {value === null ? '--' : safeValue.toFixed(1)}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: C.elevated }]}>
        <Animated.View style={[styles.fill, barStyle, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm + 2,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
});
