import { Dimensions } from 'react-native';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SPRING_NAV } from '../constants';

export const SCREEN_WIDTH = Dimensions.get('window').width;

export function useSlideAnimation() {
  const translateX = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  function goTo(index: number) {
    translateX.value = withSpring(-index * SCREEN_WIDTH, SPRING_NAV);
  }

  return { containerStyle, goTo };
}
