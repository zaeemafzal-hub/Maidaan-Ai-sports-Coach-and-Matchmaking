/**
 * Maidaan Theme Constants — CONCRETE ARENA DESIGN DIRECTION
 * Primary Graphite, Warm White, Arena Olive, Rust, Concrete Stone
 */

export const COLORS = {
  // Concrete Arena Core System
  graphite: '#242522',
  warmWhite: '#F4F1EA',
  arenaOlive: '#3D4438',
  oliveDark: '#2C3228',
  oliveMuted: '#525C4B',
  rust: '#875646',
  rustDark: '#663F33',
  rustMuted: '#9E6A58',
  concreteStone: '#D6D1C6',
  stoneLight: '#E8E4DC',
  stoneMuted: '#B8B2A6',

  // Surfaces & Borders
  ink: '#1A1C19',
  surfaceDark: '#20221F',
  surfaceCardDark: '#272A26',
  surfaceBorderDark: '#353933',
  surfaceCardBorder: '#D6D1C6',

  // Text Tokens
  textPrimary: '#242522',
  textSecondary: '#666B60',
  textMuted: '#8D9287',
  textLight: '#F4F1EA',
  textLightSecondary: '#D6D1C6',
  textLightMuted: '#9B9E95',

  // Functional Status
  live: '#875646',
  success: '#3D4438',
  warning: '#C48A3F',
  error: '#A34235',

  // Sports Identity
  sports: {
    football: '#3D4438',
    cricket: '#875646',
    padel: '#5A6254',
    badminton: '#7A6B56',
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

export const MOTION = {
  fast: 140,
  standard: 240,
  slow: 380,
} as const;

export const TYPOGRAPHY = {
  fontFamily: {
    sans: 'System',
    display: 'System',
  },
} as const;
