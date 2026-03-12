/**
 * FloatingTabBar
 * Clean, modern floating tab bar.
 * Per-tab animated background pill — no absolute-positioned sliding indicator,
 * so it works correctly on every device size.
 */
import { Feather } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Radius, Spacing, useColors } from '../../constants/theme';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const TAB_CONFIG: Record<string, { icon: FeatherName; activeIcon: FeatherName; label: string }> = {
  explore: { icon: 'compass',    activeIcon: 'compass',    label: 'Explore' },
  map:     { icon: 'map',        activeIcon: 'map',        label: 'Map'     },
  submit:  { icon: 'plus-circle', activeIcon: 'plus-circle', label: 'Rate'  },
  profile: { icon: 'user',       activeIcon: 'user',       label: 'Profile' },
};

const BAR_HEIGHT = 64;

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const C = useColors();
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((r) => !!TAB_CONFIG[r.name]);
  const activeIdx = visibleRoutes.findIndex(
    (r) => r.key === state.routes[state.index]?.key,
  );

  const handlePress = useCallback(
    (routeName: string, routeKey: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (state.routes[state.index]?.key !== routeKey) {
        navigation.navigate(routeName);
      }
    },
    [state, navigation],
  );

  return (
    <View
      style={[
        styles.outer,
        { paddingBottom: Math.max(insets.bottom, Spacing.md) },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.bar, { borderColor: C.border }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="systemMaterial" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: C.elevated }]} />
        )}

        {visibleRoutes.map((route, index) => {
          const config = TAB_CONFIG[route.name];
          const isActive = index === activeIdx;
          return (
            <TabButton
              key={route.key}
              icon={config.icon}
              label={config.label}
              isActive={isActive}
              activeColor={C.accent}
              inactiveColor={C.textDim}
              highlightColor={C.accentGlow}
              onPress={() => handlePress(route.name, route.key)}
            />
          );
        })}
      </View>
    </View>
  );
}

// ── Tab button with self-contained animated background ──────────────────────
function TabButton({
  icon,
  label,
  isActive,
  activeColor,
  inactiveColor,
  highlightColor,
  onPress,
}: {
  icon: FeatherName;
  label: string;
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
  highlightColor: string;
  onPress: () => void;
}) {
  const bgOpacity  = useSharedValue(isActive ? 1 : 0);
  const iconScale  = useSharedValue(isActive ? 1.08 : 1);
  const labelOpacity = useSharedValue(isActive ? 1 : 0.5);

  useEffect(() => {
    bgOpacity.value    = withTiming(isActive ? 1 : 0,   { duration: 200 });
    iconScale.value    = withSpring(isActive ? 1.08 : 1, { damping: 20, stiffness: 340, mass: 0.6 });
    labelOpacity.value = withTiming(isActive ? 1 : 0.5, { duration: 200 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: labelOpacity.value,
  }));

  return (
    <Pressable style={styles.tab} onPress={onPress} hitSlop={4}>
      {/* Animated background pill — lives inside the tab, never clips */}
      <Animated.View
        style={[
          styles.highlight,
          { backgroundColor: highlightColor },
          bgStyle,
        ]}
      />

      <Animated.View style={[styles.tabContent, contentStyle]}>
        <Feather
          name={icon}
          size={22}
          color={isActive ? activeColor : inactiveColor}
          strokeWidth={isActive ? 2.2 : 1.8}
        />
        <Text style={[styles.label, { color: isActive ? activeColor : inactiveColor }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    pointerEvents: 'box-none',
  } as any,
  bar: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    width: '100%',
    borderRadius: Radius.pill,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 14,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
  },
  // Highlight fills the tab cell minus a small inset — always the right size
  highlight: {
    ...StyleSheet.absoluteFillObject,
    marginHorizontal: 6,
    marginVertical: 6,
    borderRadius: Radius.pill,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
