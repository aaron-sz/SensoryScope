import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { C, PREFERENCES, SPRING_PRESS, type PreferenceId } from '../constants';

const { width: W } = Dimensions.get('window');

interface Props {
  height: number;
  isActive: boolean;
}

const SELECT_SPRING = { damping: 16, stiffness: 200, mass: 0.7 };

function Chip({ item, selected, onToggle }: {
  item: typeof PREFERENCES[number];
  selected: boolean;
  onToggle: () => void;
}) {
  const scale = useSharedValue(1);
  const progress = useSharedValue(selected ? 1 : 0);
  const checkOp = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(selected ? 1 : 0, SELECT_SPRING);
    checkOp.value = withTiming(selected ? 1 : 0, { duration: 180 });
  }, [selected]);

  const chipAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(progress.value, [0, 1], [C.card, C.primary]),
    borderColor: interpolateColor(progress.value, [0, 1], [C.border, C.primary]),
  }));

  const labelAnimStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [C.text, C.white]),
  }));

  const checkAnimStyle = useAnimatedStyle(() => ({
    opacity: checkOp.value,
    transform: [{ scale: checkOp.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.94, SPRING_PRESS);
  }
  function handlePressOut() {
    scale.value = withSpring(1, SPRING_PRESS);
  }
  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  }

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityLabel={`Toggle ${item.label}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={styles.chipPressable}
    >
      <Animated.View style={[styles.chip, chipAnimStyle]}>
        <Text style={styles.chipIcon}>{item.icon}</Text>
        <Animated.Text style={[styles.chipLabel, labelAnimStyle]}>
          {item.label}
        </Animated.Text>
        <Animated.View style={[styles.checkDot, checkAnimStyle]}>
          <Text style={styles.checkDotText}>✓</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default function PreferencesSlide({ height, isActive }: Props) {
  const [selected, setSelected] = useState<Set<PreferenceId>>(new Set());
  const contentY = useSharedValue(28);
  const contentOp = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      contentY.value = withSpring(0, { damping: 18, stiffness: 130 });
      contentOp.value = withTiming(1, { duration: 350 });
    } else {
      contentY.value = 28;
      contentOp.value = 0;
    }
  }, [isActive]);

  const contentAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentY.value }],
    opacity: contentOp.value,
  }));

  function toggle(id: PreferenceId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <View style={[styles.slide, { width: W, height }]}>
      <View style={styles.bgAccent} />

      <Animated.View style={[styles.content, contentAnimStyle]}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PERSONALISE</Text>
          </View>
        </View>

        <Text style={styles.heading}>{'What affects\nyou most?'}</Text>
        <Text style={styles.subheading}>
          Select your sensitivities. We'll highlight places that suit you.
        </Text>

        <View style={styles.grid}>
          {PREFERENCES.map((pref) => (
            <Chip
              key={pref.id}
              item={pref}
              selected={selected.has(pref.id)}
              onToggle={() => toggle(pref.id)}
            />
          ))}
        </View>

        <Animated.Text
          style={[
            styles.selectedCount,
            { opacity: selected.size > 0 ? 1 : 0 },
          ]}
        >
          {selected.size} selected — we'll filter for you
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const CHIP_W = (W - 24 * 2 - 12) / 2;

const styles = StyleSheet.create({
  slide: {
    backgroundColor: C.bg,
    overflow: 'hidden',
  },
  bgAccent: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 9999,
    backgroundColor: C.primary,
    opacity: 0.05,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: C.primaryPale,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
    letterSpacing: 1.2,
  },
  heading: {
    fontSize: 30,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.6,
    lineHeight: 38,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: C.textLight,
    lineHeight: 22,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chipPressable: {
    width: CHIP_W,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1.5,
  },
  chipIcon: {
    fontSize: 18,
  },
  chipLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  checkDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDotText: {
    fontSize: 10,
    color: C.white,
    fontWeight: '700',
  },
  selectedCount: {
    marginTop: 16,
    fontSize: 13,
    color: C.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
