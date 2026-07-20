/**
 * Design tokens — single source of truth for the app's visual language.
 * Placeholder palette pending final Mara Mortgage branding: deep navy
 * (trust) + warm gold accent, in line with top-tier financial apps.
 */

export const colors = {
  // Brand
  primary: '#0F2A4A', // deep navy
  primaryLight: '#1E4470',
  accent: '#C9A227', // warm gold
  // Surfaces
  background: '#FFFFFF',
  surface: '#F5F7FA',
  border: '#E1E6EC',
  // Text
  textPrimary: '#10202F',
  textSecondary: '#5A6B7C',
  textOnPrimary: '#FFFFFF',
  // Semantic
  success: '#1F7A4D',
  warning: '#B45309',
  error: '#B3261E',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' },
  heading: { fontSize: 22, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
} as const;

export const radii = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;
