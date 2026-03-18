export const C = {
  bg: '#FAF9F7',
  primary: '#1A6B5A',
  primaryLight: '#2A8F77',
  primaryPale: '#E8F4F1',
  primaryGlow: 'rgba(26, 107, 90, 0.22)',
  accent: '#F5A623',
  accentPale: '#FEF3DC',
  accentGlow: 'rgba(245, 166, 35, 0.22)',
  text: '#3D4A5C',
  textLight: '#6B7A8D',
  textDim: '#9BAABB',
  card: '#FFFFFF',
  border: '#E4EAF0',
  white: '#FFFFFF',
  purple: '#7C3AED',
  purplePale: '#EDE9FE',
};

export const SPRING_NAV = {
  damping: 22,
  stiffness: 100,
  mass: 0.8,
};

export const SPRING_PRESS = {
  damping: 20,
  stiffness: 280,
  mass: 0.5,
};

export const SLIDES_COUNT = 5;

export const PREFERENCES = [
  { id: 'noise', label: 'Loud Noises', icon: '🔊' },
  { id: 'lights', label: 'Bright Lights', icon: '💡' },
  { id: 'crowds', label: 'Crowds', icon: '👥' },
  { id: 'smells', label: 'Strong Smells', icon: '🌸' },
  { id: 'textures', label: 'Rough Textures', icon: '✋' },
  { id: 'patterns', label: 'Busy Patterns', icon: '🌀' },
  { id: 'temperature', label: 'Temperature', icon: '🌡️' },
  { id: 'movement', label: 'Fast Movement', icon: '💨' },
] as const;

export type PreferenceId = (typeof PREFERENCES)[number]['id'];
