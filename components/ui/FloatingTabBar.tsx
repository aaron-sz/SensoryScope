/**
 * FloatingTabBar
 * A gorgeous floating pill-shaped tab bar with:
 *  - expo-blur glass background
 *  - Animated sliding indicator that follows the active tab
 *  - Icon scale + glow animation on selection
 *  - Haptic feedback on every tap
 */
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Radius, Spacing, useColors } from '../../constants/theme';

/** Route name → icon + label */
const TAB_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  explore: { icon: 'compass', label: 'Explore' },
  submit: { icon: 'add-circle', label: 'Rate' },
  profile: { icon: 'person', label: 'Profile' },
};

const BAR_HEIGHT = 64;
const INDICATOR_SIZE = 52;

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const C = useColors();
  // Only render routes we have config for (hides explore, modal, etc.)
  const visibleRoutes = state.routes.filter((r) => !!TAB_CONFIG[r.name]);
  const activeVisibleIndex = visibleRoutes.findIndex(
    (r) => r.key === state.routes[state.index]?.key
  );

  const indicatorX = useSharedValue(0);

  // We need the tab width to position the indicator — computed after layout
  const tabWidth = useSharedValue(0);

  // Animate the indicator to the new active tab.
  // `tabWidth` is a stable shared-value ref — never put .value in deps,
  // that reads it during render and triggers Reanimated's strict-mode warning.
  useEffect(() => {
    if (tabWidth.value > 0) {
      indicatorX.value = withSpring(activeVisibleIndex * tabWidth.value, {
        damping: 22,
        stiffness: 280,
        mass: 0.8,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVisibleIndex]); // tabWidth / indicatorX are stable refs, not deps

  // Merge position + width into one animated style so we never read
  // tabWidth.value directly during JSX render.
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: tabWidth.value || INDICATOR_SIZE,
  }));

  const handlePress = useCallback(
    (routeName: string, routeKey: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const isFocused = state.routes[state.index]?.key === routeKey;
      if (!isFocused) {
        navigation.navigate(routeName);
      }
    },
    [state, navigation]
  );

  return (
    <View style={styles.outerContainer} pointerEvents="box-none">
      <View
        style={[styles.barWrapper, { borderColor: C.border }]}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width / visibleRoutes.length;
          if (tabWidth.value === 0) {
            tabWidth.value = w;
            // Position indicator immediately (no spring on first render)
            indicatorX.value = activeVisibleIndex * w;
          }
        }}
      >
        {/* Frosted background — systemMaterial adapts to light/dark mode */}
        {Platform.OS === 'android' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: C.elevated, borderRadius: Radius.pill }]} />
        ) : (
          <BlurView intensity={90} tint="systemMaterial" style={StyleSheet.absoluteFill} />
        )}

        {/* Sliding active indicator pill — width + position driven by useAnimatedStyle */}
        <Animated.View style={[styles.indicator, indicatorStyle]} />

        {/* Tab buttons */}
        {visibleRoutes.map((route, index) => {
          const config = TAB_CONFIG[route.name];
          const isActive = index === activeVisibleIndex;
          return (
            <TabButton
              key={route.key}
              icon={config.icon}
              label={config.label}
              isActive={isActive}
              onPress={() => handlePress(route.name, route.key)}
            />
          );
        })}
      </View>
    </View>
  );
}

/** Individual tab button with animated icon scale and opacity */
function TabButton({
  icon,
  label,
  isActive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const C = useColors();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isActive ? 1 : 0.45);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.15 : 1, { damping: 18, stiffness: 300 });
    opacity.value = withTiming(isActive ? 1 : 0.45, { duration: 200 });
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={[styles.tabInner, animStyle]}>
        <Ionicons
          name={isActive ? icon : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)}
          size={26}
          color={isActive ? C.accent : C.textDim}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  barWrapper: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    // borderColor set dynamically via C.border in JSX
    backgroundColor: 'transparent',
    alignItems: 'center',
    boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
    width: '100%',
  },
  androidBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: Radius.pill,
  },
  indicator: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 6,
    zIndex: 0,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(4, 120, 87, 0.25)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
    zIndex: 1,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
