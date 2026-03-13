import { Platform, useColorScheme } from 'react-native';

/**
 * SensoryScope Design System — Light + Dark Theme
 * Sensory-friendly: no harsh blacks, no neon whites. Soft, calm palettes.
 */

// ── Light Mode ─────────────────────────────────────────────────────────────
export const LightColors = {
  bg: '#FCFDFD',
  surface: '#F4F4F5',
  elevated: '#FFFFFF',
  border: '#E4E4E7',

  primary: '#0F172A',
  primaryLight: '#475569',
  primaryDark: '#020617',
  primaryGlow: 'rgba(15, 23, 42, 0.04)',

  accent: '#7a8d87',
  accentLight: '#c0d2cb',
  accentDark: '#6a6d6c',
  accentGlow: 'rgba(68, 68, 68, 0.15)',

  calm: '#3ab98f',
  moderate: '#ce9b43',
  intense: '#d74c64',
  calmGlow: 'rgba(16, 185, 129, 0.12)',
  moderateGlow: 'rgba(245, 159, 11, 0.12)',
  intenseGlow: 'rgba(244, 63, 94, 0.12)',

  text: '#1E293B',
  textMuted: '#64748B',
  textDim: '#94A3B8',
};

// ── Dark Mode ──────────────────────────────────────────────────────────────
// Deep navy tones — easier on sensitive eyes than pure #000
export const DarkColors: typeof LightColors = {
  bg: '#080F1E',
  surface: '#0F1826',
  elevated: '#18243A',
  border: '#1E2D40',

  primary: '#F1F5F9',
  primaryLight: '#94A3B8',
  primaryDark: '#F8FAFC',
  primaryGlow: 'rgba(241, 245, 249, 0.04)',

  accent: '#10B981',
  accentLight: '#34D399',
  accentDark: '#059669',
  accentGlow: 'rgba(16, 185, 129, 0.20)',

  calm: '#10B981',
  moderate: '#F59E0B',
  intense: '#F43F5E',
  calmGlow: 'rgba(16, 185, 129, 0.18)',
  moderateGlow: 'rgba(245, 158, 11, 0.18)',
  intenseGlow: 'rgba(244, 63, 94, 0.18)',

  text: '#F1F5F9',
  textMuted: '#94A3B8',
  textDim: '#7A9AB8',   // Visible on dark navy — was #475569 which is near-invisible
};


// Default export — light mode (backwards compat for files not yet migrated)
export const Colors = LightColors;

/** Call this hook in any component to get the right color palette */
export function useColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DarkColors : LightColors;
}

/**
 * Returns a theme-aware function that maps a 1–10 sensory score to its color.
 * Use this in components instead of the static `scoreColor()` helper.
 */
export function useScoreColor() {
  const C = useColors();
  return (score: number): string => {
    if (score <= 3) return C.calm;
    if (score <= 6) return C.moderate;
    return C.intense;
  };
}

/**
 * Returns a theme-aware function that maps a 1–10 sensory score to its glow color.
 */
export function useScoreGlow() {
  const C = useColors();
  return (score: number): string => {
    if (score <= 3) return C.calmGlow;
    if (score <= 6) return C.moderateGlow;
    return C.intenseGlow;
  };
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 14,      // Slightly larger for that modern "bubbly" iOS feel
  lg: 20,      // Perfect for bottom sheets or large cards
  xl: 28,
  pill: 999,
};

export const Fonts = {
  // Using system fonts by default to avoid extra weight
  regular: Platform.select({ ios: 'System', android: 'sans-serif' }),
  medium: Platform.select({ ios: 'System', android: 'sans-serif-medium' }),
  bold: Platform.select({ ios: 'System', android: 'sans-serif-bold' }),
  rounded: Platform.select({ ios: 'System', android: 'sans-serif' }),
  mono: Platform.select({ ios: 'Courier', android: 'monospace' }),
};

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  caption: {
    fontSize: 13,
    color: Colors.textMuted,
  },
};

export const Shadows = {
  // Modern shadows are larger and more transparent, not tight and dark
  card: {
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  // NOTE: Override `shadowColor` at the call site with `C.accent` for a branded glow.
  // e.g. { ...Shadows.glow, shadowColor: C.accent }
  glow: {
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  subtle: {
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
};

export const scoreColor = (score: number): string => {
  if (score <= 3) return Colors.calm;
  if (score <= 6) return Colors.moderate;
  return Colors.intense;
};

export const scoreGlow = (score: number): string => {
  if (score <= 3) return Colors.calmGlow;
  if (score <= 6) return Colors.moderateGlow;
  return Colors.intenseGlow;
};
