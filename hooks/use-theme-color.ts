/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { LightColors, DarkColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ThemeColors = { light: LightColors, dark: DarkColors };

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof LightColors & keyof typeof DarkColors
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return ThemeColors[theme][colorName];
  }
}
