/**
 * Maidaan Design System Tokens (Cinematic Obsidian & Solar Orange)
 * Modern dark-neutral athletic base, solar orange energetic accents, polished card hierarchy.
 */

export const COLORS = {
  // Base & Layered Obsidian Surfaces
  canvas: "#0C0D0E",
  background: "#0C0D0E",
  surfaceDepth: "#101214",
  surface: "#141518",
  surfaceElevated: "#1B1D22",
  surfaceGlossy: "#20232A",
  surfaceCard: "rgba(20,21,24,0.24)",
  surfaceSoft: "#1B1D22",
  surfaceHighlight: "#22252B",
  surfaceTranslucent: "rgba(20, 21, 24, 0.88)",

  // Borders
  border: "rgba(255, 255, 255, 0.08)",
  borderLight: "rgba(255, 255, 255, 0.12)",
  borderSubtle: "rgba(255, 255, 255, 0.06)",
  borderActive: "#E85D26",

  // Typography
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A5AD",
  textMuted: "#5C616A",
  textInverse: "#0C0D0E",

  // Brand Primary (Solar Orange)
  brandPrimary: "#E85D26",
  brandPressed: "#FF723A",
  brandHover: "#FF723A",
  brandGlow: "rgba(232, 93, 38, 0.28)",
  brandSoft: "rgba(232, 93, 38, 0.14)",
  brandAmbient: "rgba(232, 93, 38, 0.08)",
  brandAmbientStrong: "rgba(232, 93, 38, 0.16)",

  // Primary Sports Energetic Accent (Solar Orange)
  accent: "#E85D26",
  accentDark: "#D44A15",
  accentSoft: "rgba(232, 93, 38, 0.14)",
  accentGlow: "rgba(232, 93, 38, 0.28)",

  // Semantic Status Tokens
  outdoorSuitable: "#22C55E",
  caution: "#F59E0B",
  indoorPreferred: "#EF4444",
  verifiedBadge: "#3B82F6",

  // Standard Functional Statuses
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  // The 4 Core Sports Identities
  sports: {
    cricket: "#F4A261",
    badminton: "#7FD1AE",
    padel: "#64B5F6",
    football: "#22C55E",
  },

  // Legacy mappings for strict backwards compatibility
  graphite: "#FFFFFF",
  warmWhite: "#FFFFFF",
  arenaOlive: "#22C55E",
  oliveDark: "#16A34A",
  oliveMuted: "#7FD1AE",
  rust: "#E85D26",
  rustDark: "#D44A15",
  rustMuted: "#FF723A",
  warm: "#E85D26",
  warmSoft: "rgba(232, 93, 38, 0.14)",
  secondary: "#7FD1AE",
  secondarySoft: "rgba(127, 209, 174, 0.14)",
  concreteStone: "#141518",
  stoneLight: "#1B1D22",
  stoneMuted: "#A0A5AD",
  ink: "#0C0D0E",
  surfaceDark: "#141518",
  surfaceCardDark: "rgba(20,21,24,0.24)",
  surfaceBorderDark: "rgba(255, 255, 255, 0.08)",
  surfaceCardBorder: "rgba(255, 255, 255, 0.08)",
  textLight: "#FFFFFF",
  textLightSecondary: "#AEB6BE",
  textLightMuted: "#5C616A",
  live: "#EF4444",
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
} as const;

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  full: 9999,
} as const;

export const MOTION = {
  instant: 100,
  fast: 180,
  standard: 260,
  slow: 360,
} as const;

export const TYPOGRAPHY = {
  display: {
    fontSize: 32,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 22,
  },
  secondary: {
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 18,
  },
  caption: {
    fontSize: 11,
    fontWeight: "500" as const,
    letterSpacing: 0.2,
  },
} as const;
