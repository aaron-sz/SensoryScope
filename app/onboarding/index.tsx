import React, { useEffect, useState } from 'react';
import { Dimensions, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { C, SLIDES_COUNT } from '../../constants/onboarding';

const ONBOARDING_KEY = 'sensoryscope_onboarding_v1';
import { useSlideAnimation } from '../../hooks/useSlideAnimation';
import WelcomeSlide from './slides/WelcomeSlide';
import WhatIsSlide from './slides/WhatIsSlide';
import HowItWorksSlide from './slides/HowItWorksSlide';
import PermissionsSlide from './slides/PermissionsSlide';
import AllSetSlide from './slides/AllSetSlide';

const { width: W } = Dimensions.get('window');

// --- Animated progress dot ---
function Dot({ isActive }: { isActive: boolean }) {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, { duration: 250 });
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    width: 7 + progress.value * 19,
    backgroundColor: interpolateColor(progress.value, [0, 1], [C.border, C.primary]),
  }));

  return <Animated.View style={[styles.dot, animStyle]} />;
}

// --- Main screen ---
export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideAreaHeight, setSlideAreaHeight] = useState(0);
  const { containerStyle, goTo } = useSlideAnimation();

  function navigate(index: number) {
    setCurrentSlide(index);
    goTo(index);
  }

  function handleNext() {
    if (currentSlide < SLIDES_COUNT - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigate(currentSlide + 1);
    }
  }

  function handleSkip() {
    SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)');
  }

  function handleComplete() {
    SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)');
  }

  const isLastSlide = currentSlide === SLIDES_COUNT - 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      {/* Slides area */}
      <View
        style={styles.slidesArea}
        onLayout={(e) => setSlideAreaHeight(e.nativeEvent.layout.height)}
      >
        {slideAreaHeight > 0 && (
          <Animated.View
            style={[
              styles.slidesRow,
              { width: W * SLIDES_COUNT, height: slideAreaHeight },
              containerStyle,
            ]}
          >
            <WelcomeSlide height={slideAreaHeight} isActive={currentSlide === 0} />
            <WhatIsSlide height={slideAreaHeight} isActive={currentSlide === 1} />
            <HowItWorksSlide height={slideAreaHeight} isActive={currentSlide === 2} />
            <PermissionsSlide height={slideAreaHeight} isActive={currentSlide === 3} />
            <AllSetSlide
              height={slideAreaHeight}
              isActive={currentSlide === 4}
              onComplete={handleComplete}
            />
          </Animated.View>
        )}
      </View>

      {/* Animated progress dots */}
      <View
        style={styles.dotsRow}
        accessibilityLabel={`Step ${currentSlide + 1} of ${SLIDES_COUNT}`}
        accessibilityRole="progressbar"
      >
        {Array.from({ length: SLIDES_COUNT }, (_, i) => (
          <Dot key={i} isActive={i === currentSlide} />
        ))}
      </View>

      {/* Navigation */}
      {!isLastSlide ? (
        <View style={styles.navRow}>
          <Pressable
            onPress={handleSkip}
            accessibilityLabel="Skip onboarding"
            accessibilityRole="button"
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>

          <Pressable
            onPress={handleNext}
            accessibilityLabel={`Go to step ${currentSlide + 2}`}
            accessibilityRole="button"
            style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.nextText}>Next  →</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.navSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  slidesArea: {
    flex: 1,
    overflow: 'hidden',
  },
  slidesRow: {
    flexDirection: 'row',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 7,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  navSpacer: {
    height: 60,
  },
  skipBtn: {
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 16,
    color: C.textLight,
    fontWeight: '500',
  },
  nextBtn: {
    backgroundColor: C.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  nextText: {
    fontSize: 16,
    color: C.white,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
