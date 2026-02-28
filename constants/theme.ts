/**
 * SensoryScope Design System — Calm Minimalist Theme
 * Clean, modern, soft-white base with soothing emerald and coral accents.
 */

export const Colors = {
  // ── Backgrounds ──────────────────────────────
  // Slightly warmer off-whites prevent "screen glare" for light-sensitive users
  bg:       '#FCFDFD',   // Soft pure white
  surface:  '#F4F4F5',   // Zinc-100 — cards, bottom sheets
  elevated: '#FFFFFF',   // Pure white for floating elements to pop
  border:   '#E4E4E7',   // Zinc-200 — subtle, almost invisible dividers

  // ── Primary (Text & UI Chrome) ───────────────
  // Moving away from harsh black to deep Slate for softer contrast
  primary:      '#0F172A',   // Slate-900 (Main text/headings)
  primaryLight: '#475569',   // Slate-600 (Icons, secondary UI)
  primaryDark:  '#020617',   // Slate-950 (High emphasis)
  primaryGlow:  'rgba(15, 23, 42, 0.04)',

  // ── Accent (Premium Emerald Green) ───────────
  // A slight shift from basic green to a more premium, calming Emerald
  accent:      '#10B981',    // Emerald-500 (Primary buttons, active states)
  accentLight: '#34D399',    // Emerald-400 (Hover states, light accents)
  accentDark:  '#047857',    // Emerald-700 (Pressed states)
  accentGlow:  'rgba(16, 185, 129, 0.15)', // Soft green glow

  // ── Sensory Score Colors (The "Waze" Pins) ───
  // Replaced aggressive traffic-light colors with softer, modern pastels
  calm:     '#10B981', // Emerald (Quiet/Safe)
  moderate: '#F59E0B', // Amber (Noticeable but okay)
  intense:  '#F43F5E', // Rose/Coral (Loud/Overwhelming - softer than pure Red)

  calmGlow:     'rgba(16, 185, 129, 0.12)',
  moderateGlow: 'rgba(245, 158, 11, 0.12)',
  intenseGlow:  'rgba(244, 63, 94, 0.12)',

  // ── Text ─────────────────────────────────────
  text:      '#1E293B', // Slate-800 (Easier to read for dyslexia/visual stress)
  textMuted: '#64748B', // Slate-500 (Captions, subtitles)
  textDim:   '#94A3B8', // Slate-400 (Placeholder text)
};

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

export const Shadows = {
  // Modern shadows are larger and more transparent, not tight and dark
  card: {
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  glow: {
    elevation: 8,
    shadowColor: Colors.accent,
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