/**
 * OverallBadge — Pill-shaped overall sensory level indicator
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Radius, Spacing, useColors, useScoreColor } from '../../constants/theme';

interface Props {
  score: number | null;
  reviewCount: number;
}

export default function OverallBadge({ score, reviewCount }: Props) {
  const C = useColors();
  const getColor = useScoreColor();

  if (score === null) {
    return (
      <View style={[styles.badge, { backgroundColor: C.elevated, borderColor: C.border }]}>
        <Text style={[styles.label, { color: C.textDim }]}>No ratings yet</Text>
      </View>
    );
  }

  const color = getColor(score);
  const level = score <= 3 ? 'Calm' : score <= 6 ? 'Moderate' : 'Intense';

  return (
    <View style={[styles.badge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
      <Text style={[styles.score, { color }]}>{score.toFixed(1)}</Text>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{level}</Text>
      <Text style={[styles.count, { color: C.textMuted }]}>
        {reviewCount} rating{reviewCount !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: 6,
  },
  score: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  count: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 2,
  },
});
