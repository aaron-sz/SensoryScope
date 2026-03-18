import { Platform, useColorScheme } from 'react-native';

/**
 * SensoryScope Design System — Light + Dark Theme
 * Sensory-friendly: no harsh blacks, no neon whites. Soft, calm palettes.
 */

// ── Light Mode ─────────────────────────────────────────────────────────────
export const LightColors = {
  // Very subtle teal tint on backgrounds — warm, cohesive, intentional
  bg: '#F5FBFA',
  surface: '#EDF4F2',
  elevated: '#FFFFFF',
  border: '#D8E8E5',

  primary: '#0F172A',
  primaryLight: '#475569',
  primaryDark: '#020617',
  primaryGlow: 'rgba(15, 23, 42, 0.04)',

  // Accent: proper sage-teal with actual saturation — distinct from calm (#3ab98f)
  // Previous value (#7a8d87) had near-zero saturation and read as gray
  accent: '#2A8C7C',
  accentLight: '#7ECAC1',
  accentDark: '#1F6B5E',
  accentGlow: 'rgba(42, 140, 124, 0.15)',

  calm: '#3ab98f',           // teal-green — inviting, safe
  moderate: '#D4A72C',       // rich sunflower gold — clearly yellow, warm not muddy
  intense: '#D4687A',        // dusty rose — noticeable but not alarming
  calmGlow: 'rgba(58, 185, 143, 0.12)',
  moderateGlow: 'rgba(212, 167, 44, 0.12)',
  intenseGlow: 'rgba(212, 104, 122, 0.12)',

  text: '#1E293B',
  textMuted: '#64748B',
  textDim: '#94A3B8',
};

// ── Dark Mode ──────────────────────────────────────────────────────────────
// Soft charcoal — Apple-style dark mode. Warm, breathable, not cave-black.
// Tinted slightly toward slate-blue for cohesion with the teal accent.
export const DarkColors: typeof LightColors = {
  bg: '#151B23',         // warm charcoal, easy on eyes
  surface: '#1C2530',    // one step up, clearly distinct from bg
  elevated: '#253141',   // cards/sheets — visible lift without being bright
  border: '#334155',     // slate-700 — actually visible dividers

  primary: '#E8EDF2',    // slightly warm off-white, not harsh #FFF
  primaryLight: '#94A3B8',
  primaryDark: '#F1F5F9',
  primaryGlow: 'rgba(232, 237, 242, 0.05)',

  // Accent: soft teal — reads as "brand" without neon glare
  accent: '#5CC8BC',
  accentLight: '#8EDAD2',
  accentDark: '#3A9E94',
  accentGlow: 'rgba(92, 200, 188, 0.18)',

  // Sensory scale — lifted for dark backgrounds, same hue families as light.
  calm: '#6EE7B7',        // soft mint
  moderate: '#FFD966',    // bright clean yellow — sunny, not washed or orange
  intense: '#F0899B',     // lifted dusty rose
  calmGlow: 'rgba(110, 231, 183, 0.18)',
  moderateGlow: 'rgba(255, 217, 102, 0.18)',
  intenseGlow: 'rgba(240, 137, 155, 0.18)',

  text: '#E8EDF2',        // warm off-white
  textMuted: '#9CA8B8',   // readable mid-tone
  textDim: '#6B7D94',     // subtle but not invisible
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
